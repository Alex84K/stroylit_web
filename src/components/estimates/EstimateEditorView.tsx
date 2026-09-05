import type { FC } from "react"
import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAppDispatch, useAppSelector, useAppStore } from "../../app/hooks"
import { ApiError } from "../../utils/api"
import {
  DEFAULT_CURRENCY,
  LAST_CURRENCY_STORAGE_KEY,
} from "../../features/estimates/constants"
import {
  addItems,
  makeEmptyDraftItem,
  moveItem,
  regenerateDraftId,
  removeItem,
  resetEditor,
  selectBaseUpdatedAt,
  selectDraft,
  selectDraftTotals,
  selectIsDirty,
  selectShowPurchase,
  setInitialDraft,
  startNewDraft,
  toggleShowPurchase,
  updateItem,
  updateScalar,
} from "../../features/estimates/estimateEditorSlice"
import { estimatesApi } from "../../features/estimates/estimates.api"
import {
  ESTIMATES_QUERY_KEY,
  useGetEstimate,
  useOpenEstimatePdf,
  usePatchEstimate,
  usePutEstimate,
} from "../../features/estimates/estimates.hooks"
import { buildEstimateBody } from "../../features/estimates/utils/buildEstimateBody"
import { fromTemplateItems } from "../../features/estimates/utils/fromCatalog"
import {
  pdfErrorMessage,
  showPdfLoadingPlaceholder,
} from "../../features/estimates/utils/pdfTab"
import {
  useGetTasksByEstimate,
  useReplaceTasksByEstimate,
} from "../../features/planner/tasks.hooks"
import { tasksFromEstimateItems } from "../../features/planner/utils/fromEstimateItems"
import type {
  Estimate,
  EstimatePatch,
  EstimateTemplate,
} from "../../features/estimates/types"
import type { Project } from "../../features/projects/types"
import { EstimateHeader } from "./EstimateHeader"
import { EstimateItemsTable } from "./EstimateItemsTable"
import { EstimateTotalsSummary } from "./EstimateTotalsSummary"
import { ApplyTemplateModal } from "../modals/ApplyTemplateModal"
import { ConfirmDeleteModal } from "../modals/ConfirmDeleteModal"
import { EditEstimateItemModal } from "../modals/EditEstimateItemModal"
import { SaveAsTemplateModal } from "../modals/SaveAsTemplateModal"
import { SaveConflictModal } from "../modals/SaveConflictModal"
import { SelectCatalogItemsModal } from "../modals/SelectCatalogItemsModal"

type SaveError = { message: string; canSaveAsNew: boolean }

type Props = {
  project: Project
  mode: "create" | "edit"
  estimateId: string | null
  onCreated: (estimate: Estimate) => void
  onExit: () => void
  onGoToCatalog: () => void
}

const readLastCurrency = (): string => {
  const stored = localStorage.getItem(LAST_CURRENCY_STORAGE_KEY)
  return stored ?? DEFAULT_CURRENCY
}

export const EstimateEditorView: FC<Props> = ({
  project,
  mode,
  estimateId,
  onCreated,
  onExit,
  onGoToCatalog,
}) => {
  const dispatch = useAppDispatch()
  const store = useAppStore()
  const queryClient = useQueryClient()
  const draft = useAppSelector(selectDraft)
  const isDirty = useAppSelector(selectIsDirty)
  const showPurchase = useAppSelector(selectShowPurchase)
  const baseUpdatedAt = useAppSelector(selectBaseUpdatedAt)
  const totals = useAppSelector(selectDraftTotals)

  const putEstimate = usePutEstimate()
  const patchEstimate = usePatchEstimate()
  const isPending = putEstimate.isPending || patchEstimate.isPending

  const [saveError, setSaveError] = useState<SaveError | null>(null)
  const [conflict, setConflict] = useState<Estimate | null>(null)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false)
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false)
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [plannerConfirmOpen, setPlannerConfirmOpen] = useState(false)
  const [plannerResult, setPlannerResult] = useState<{
    created: number
    replaced: boolean
  } | null>(null)
  const overwriteRef = useRef(false)

  const id = mode === "edit" ? estimateId : null
  const { data: estimate, isLoading, isError, error } = useGetEstimate(id)

  // Tasks hang off the estimate (ADR-013 decision 5) — the estimate's stages
  // are read only to know whether one already exists: creating the planner
  // over a non-empty list REPLACES it (collection PUT semantics), so the
  // button asks first. Only needed in edit mode, where id is set.
  const estimateTasks = useGetTasksByEstimate(id ?? undefined)
  const replaceTasks = useReplaceTasksByEstimate()
  const openPdf = useOpenEstimatePdf()

  // create mode: an empty draft is minted once; leaving resets the editor.
  useEffect(() => {
    if (mode !== "create") return
    dispatch(
      startNewDraft({ projectId: project.id, currency: readLastCurrency() }),
    )
    return () => {
      dispatch(resetEditor())
    }
  }, [mode, project.id, dispatch])

  // edit mode: seed from the server version; leaving resets the editor.
  useEffect(() => {
    if (mode !== "edit" || !estimate) return
    dispatch(setInitialDraft(estimate))
    return () => {
      dispatch(resetEditor())
    }
  }, [mode, estimate, dispatch])

  // beforeunload — the only native dialog left (DESIGN §11.2).
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", handler)
    return () => {
      window.removeEventListener("beforeunload", handler)
    }
  }, [isDirty])

  if (mode === "edit" && isLoading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </div>
      </div>
    )
  }

  if (mode === "edit" && (isError || !estimate)) {
    const message =
      error instanceof ApiError && error.status === 404
        ? "Смета не найдена — возможно, она удалена."
        : error instanceof ApiError
          ? error.message
          : "Не удалось загрузить смету."
    return (
      <div>
        <div className="alert alert-danger" role="alert">
          {message}
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onExit}
        >
          К списку смет
        </button>
      </div>
    )
  }

  if (!draft) return null

  const handleSaveError = (err: unknown) => {
    if (err instanceof ApiError && err.status === 404 && mode === "edit") {
      setSaveError({
        message:
          "Смета или проект удалены в другом окне. Черновик не потерян — можно сохранить его как новую смету.",
        canSaveAsNew: true,
      })
    } else if (err instanceof ApiError && err.status === 413) {
      setSaveError({
        message: "Смета слишком большая — сократите описания позиций.",
        canSaveAsNew: false,
      })
    } else if (err instanceof ApiError) {
      setSaveError({
        message: `Не удалось сохранить: ${err.message}`,
        canSaveAsNew: false,
      })
    } else {
      setSaveError({
        message: "Не удалось сохранить. Черновик остался в редакторе.",
        canSaveAsNew: false,
      })
    }
  }

  // The save button works while an input still holds an uncommitted buffer:
  // blurring the input commits first, so the fresh state is read from the
  // store here, not from the closure.
  const persist = async (isCreate: boolean) => {
    const state = store.getState()
    const d = state.estimateEditor.draft
    if (!d) return
    const dirtyItems = state.estimateEditor.itemsDirty
    if (isCreate || dirtyItems) {
      const saved = await putEstimate.mutateAsync({
        id: d.id,
        data: buildEstimateBody(d),
      })
      dispatch(setInitialDraft(saved))
      localStorage.setItem(LAST_CURRENCY_STORAGE_KEY, saved.currency)
      if (isCreate) onCreated(saved)
    } else {
      const patch: EstimatePatch = {
        title: d.title,
        currency: d.currency,
        taxRateBp: d.taxRateBp,
        discountBp: d.discountBp,
        note: d.note,
      }
      const saved = await patchEstimate.mutateAsync({ id: d.id, patch })
      dispatch(setInitialDraft(saved))
    }
  }

  // Returns whether the estimate ended up saved — callers that need to
  // chain on a successful save (e.g. "save, then open the PDF") read this
  // instead of duplicating the conflict/error handling below.
  const handleSave = async (): Promise<boolean> => {
    if (isPending) return false
    setSaveError(null)
    try {
      // D11 guard (edit mode only): a control GET before the write; a
      // different updatedAt means someone else edited it.
      if (mode === "edit" && !overwriteRef.current) {
        const state = store.getState()
        const d = state.estimateEditor.draft
        if (!d) return false
        const base = state.estimateEditor.baseUpdatedAt
        const fresh = await estimatesApi.getById(d.id)
        if (base && fresh.updatedAt !== base) {
          setConflict(fresh)
          return false
        }
      }
      await persist(mode === "create")
      return true
    } catch (err) {
      handleSaveError(err)
      return false
    } finally {
      overwriteRef.current = false
    }
  }

  // 404 on PUT in edit mode: same content under a fresh UUIDv7 address.
  const handleSaveAsNew = async () => {
    if (isPending) return
    setSaveError(null)
    try {
      dispatch(regenerateDraftId())
      const state = store.getState()
      const d = state.estimateEditor.draft
      if (!d) return
      const saved = await putEstimate.mutateAsync({
        id: d.id,
        data: buildEstimateBody(d),
      })
      dispatch(setInitialDraft(saved))
      localStorage.setItem(LAST_CURRENCY_STORAGE_KEY, saved.currency)
      onCreated(saved)
    } catch (err) {
      handleSaveError(err)
    }
  }

  const applyTemplate = (t: EstimateTemplate, copyRates: boolean) => {
    dispatch(addItems(fromTemplateItems(t.items)))
    if (copyRates) {
      dispatch(updateScalar({ field: "taxRateBp", value: t.taxRateBp }))
      dispatch(updateScalar({ field: "discountBp", value: t.discountBp }))
    }
  }

  // «Создать планировщик» — generate one stage per estimate line (blank rows
  // skipped) and write the list in ONE collection PUT, the same mechanics as
  // applying a template (D6). Fully client-side: the endpoint already exists.
  // The generated stages carry no item links — task_estimate_items has no
  // handlers yet (ADR-013 decision 7), so stage money stays 0 for now.
  const plannerUsableCount = draft.items.filter(
    it => it.title.trim() !== "",
  ).length

  const createPlannerTasks = () => {
    setPlannerConfirmOpen(false)
    const tasks = tasksFromEstimateItems(draft.items)
    if (tasks.length === 0) return
    const replaced = (estimateTasks.data?.length ?? 0) > 0
    replaceTasks.mutate(
      { estimateId: draft.id, tasks },
      {
        onSuccess: () => {
          setPlannerResult({ created: tasks.length, replaced })
        },
      },
    )
  }

  const handleCreatePlanner = () => {
    if (plannerUsableCount === 0) return
    // The collection PUT replaces the whole list: over a non-empty list it
    // would destroy marked-off work (D6), so ask first.
    if ((estimateTasks.data?.length ?? 0) > 0) {
      setPlannerConfirmOpen(true)
      return
    }
    createPlannerTasks()
  }

  // Opens the tab synchronously, before any await, so the browser treats
  // it as a direct result of the click rather than a blocked popup (see
  // utils/pdfTab.ts). id is non-null here: the button only renders in edit
  // mode, where estimateId is always set.
  const handleViewPdf = () => {
    if (!id) return
    const popup = window.open("", "_blank")
    if (popup) showPdfLoadingPlaceholder(popup)
    openPdf.mutate({
      id,
      popup,
      ensureSaved: () => (isDirty ? handleSave() : Promise.resolve(true)),
    })
  }

  const editItem = editItemId
    ? (draft.items.find(it => it.id === editItemId) ?? null)
    : null

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={onExit}
        >
          <i className="bi bi-arrow-left me-1" />
          {mode === "create" ? "Отмена" : "К списку смет"}
        </button>
        {isDirty && <span className="badge text-bg-warning">Не сохранено</span>}
      </div>

      <div className="row g-4">
        {/* Left Column: Header and Table of Items */}
        <div className="col-12 col-xl-8">
          <EstimateHeader />

          <div className="mt-3">
            <EstimateItemsTable
              items={draft.items}
              currency={draft.currency}
              showPurchase={showPurchase}
              resetToken={baseUpdatedAt}
              onAddEmpty={() => dispatch(addItems([makeEmptyDraftItem()]))}
              onOpenCatalog={() => {
                setCatalogOpen(true)
              }}
              onCommit={(itemId, patch) =>
                dispatch(updateItem({ id: itemId, patch }))
              }
              onRemove={itemId => dispatch(removeItem(itemId))}
              onMove={(from, to) => dispatch(moveItem({ from, to }))}
              onEditFields={itemId => {
                setEditItemId(itemId)
              }}
              onToggleShowPurchase={() => dispatch(toggleShowPurchase())}
            />
          </div>
        </div>

        {/* Right Column: Sticky Totals Summary & Actions */}
        <div className="col-12 col-xl-4">
          <div className="sticky-top" style={{ top: "1rem" }}>
            <EstimateTotalsSummary
              totals={totals}
              currency={draft.currency}
              taxRateBp={draft.taxRateBp}
              discountBp={draft.discountBp}
              showPurchase={showPurchase}
              isDirty={isDirty}
              isPending={isPending}
              saveError={saveError}
              onSave={() => {
                void handleSave()
              }}
              onSaveAsNew={() => {
                void handleSaveAsNew()
              }}
              onSaveAsTemplate={() => {
                setSaveAsTemplateOpen(true)
              }}
              onApplyTemplate={() => {
                setApplyTemplateOpen(true)
              }}
            />

            {mode === "edit" && (
              <div className="card shadow-sm border-0 rounded-4 mt-3">
                <div className="card-body p-3 d-flex flex-column gap-2">
                  <h6 className="fw-bold mb-1 small text-muted text-uppercase">Действия со сметой</h6>
                  
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm fw-semibold w-100 d-flex align-items-center justify-content-center gap-2"
                    onClick={handleViewPdf}
                    disabled={openPdf.isPending}
                  >
                    <i className="bi bi-file-earmark-pdf" />
                    <span>
                      {openPdf.isPending
                        ? "Формируем PDF…"
                        : isDirty
                          ? "Сохранить и открыть PDF"
                          : "Смотреть PDF"}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm fw-semibold w-100 d-flex align-items-center justify-content-center gap-2"
                    onClick={handleCreatePlanner}
                    disabled={plannerUsableCount === 0 || replaceTasks.isPending}
                    title={
                      plannerUsableCount === 0
                        ? "Добавьте позиции в смету, чтобы создать этапы"
                        : undefined
                    }
                  >
                    <i className="bi bi-list-check" />
                    <span>{replaceTasks.isPending ? "Создание..." : "Сформировать этапы"}</span>
                  </button>

                  {plannerResult && (
                    <div className="alert alert-success py-2 px-3 small mt-2 mb-0" role="alert">
                      Создано этапов: {plannerResult.created}
                      {plannerResult.replaced
                        ? ". Предыдущие этапы заменены."
                        : ". Этапы доступны на доске работ."}
                    </div>
                  )}

                  {openPdf.error && !conflict && (
                    <div className="alert alert-danger py-2 px-3 small mt-2 mb-0" role="alert">
                      {pdfErrorMessage(openPdf.error)}
                    </div>
                  )}

                  {replaceTasks.error && (
                    <div className="alert alert-danger py-2 px-3 small mt-2 mb-0" role="alert">
                      {replaceTasks.error instanceof ApiError
                        ? replaceTasks.error.message
                        : "Не удалось создать этапы"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {catalogOpen && (
        <SelectCatalogItemsModal
          onAdd={items => dispatch(addItems(items))}
          onClose={() => {
            setCatalogOpen(false)
          }}
          onCreateCatalogItem={() => {
            setCatalogOpen(false)
            onGoToCatalog()
          }}
        />
      )}

      {applyTemplateOpen && (
        <ApplyTemplateModal
          defaultCopyRates={draft.taxRateBp === 0 && draft.discountBp === 0}
          onApply={(t, copyRates) => {
            applyTemplate(t, copyRates)
            setApplyTemplateOpen(false)
          }}
          onClose={() => {
            setApplyTemplateOpen(false)
          }}
        />
      )}

      {saveAsTemplateOpen && (
        <SaveAsTemplateModal
          draft={draft}
          onClose={() => {
            setSaveAsTemplateOpen(false)
          }}
        />
      )}

      {editItem && (
        <EditEstimateItemModal
          item={editItem}
          onSave={patch => {
            dispatch(updateItem({ id: editItem.id, patch }))
            setEditItemId(null)
          }}
          onClose={() => {
            setEditItemId(null)
          }}
        />
      )}

      {conflict && (
        <SaveConflictModal
          title="Смета изменилась в другом окне"
          updatedAt={conflict.updatedAt}
          onClose={() => {
            setConflict(null)
          }}
          onRead={() => {
            setConflict(null)
            void queryClient.invalidateQueries({
              queryKey: [...ESTIMATES_QUERY_KEY, "detail", conflict.id],
            })
          }}
          onOverwrite={() => {
            setConflict(null)
            overwriteRef.current = true
            void handleSave()
          }}
        />
      )}

      {plannerConfirmOpen && (
        <ConfirmDeleteModal
          title="Заменить этапы?"
          message={
            <>
              У этой сметы уже есть этапы. Создание планировщика из сметы{" "}
              <strong>заменит</strong> существующий список — статусы и отметки
              прогресса будут потеряны. Заменить?
            </>
          }
          confirmLabel="Заменить"
          isPending={replaceTasks.isPending}
          onConfirm={createPlannerTasks}
          onClose={() => {
            setPlannerConfirmOpen(false)
          }}
        />
      )}
    </div>
  )
}
