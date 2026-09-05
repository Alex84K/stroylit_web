import type { FC } from "react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector, useAppStore } from "../../../../app/hooks"
import {
  addItems,
  removeItem,
  resetEditor,
  selectDraft,
  selectDraftTotals,
  selectIsDirty,
  setInitialDraft,
  startNewDraft,
  updateItem,
} from "../../estimateEditorSlice"
import {
  useGetCatalog,
  useGetSystemCatalog,
  usePutCatalogItem,
  useDeleteCatalogItem,
} from "../../catalog.hooks"
import {
  useGetEstimate,
  useOpenEstimatePdf,
  usePatchEstimate,
  usePutEstimate,
} from "../../estimates.hooks"
import { buildEstimateBody } from "../../utils/buildEstimateBody"
import { computeTotals } from "../../utils/totals"
import { fromCatalogItem } from "../../utils/fromCatalog"
import { showPdfLoadingPlaceholder, pdfErrorMessage } from "../../utils/pdfTab"
import type { CatalogItem, CatalogItemInput, Estimate, EstimateItemInput, EstimatePatch } from "../../types"
import type { Project } from "../../../projects/types"
import { uuidv7 } from "../../../../utils/uuid"
import { CatalogPickerSection } from "./CatalogPickerSection"
import { EstimateCartSection } from "./EstimateCartSection"
import { AddCustomPositionModal } from "./AddCustomPositionModal"
import { EditCatalogItemModal } from "./EditCatalogItemModal"
import { SendEstimateModal } from "./SendEstimateModal"
import { EditEstimateItemModal } from "../../../../components/modals/EditEstimateItemModal"
import { SaveConflictModal } from "../../../../components/modals/SaveConflictModal"
import { ApiError } from "../../../../utils/api"

interface Props {
  project: Project
  estimateId?: string | null
  onExit?: () => void
}

export const EstimateBuilderView: FC<Props> = ({
  project,
  estimateId,
  onExit,
}) => {
  const dispatch = useAppDispatch()
  const store = useAppStore()
  const navigate = useNavigate()

  const draft = useAppSelector(selectDraft)
  const totals = useAppSelector(selectDraftTotals)
  const isDirty = useAppSelector(selectIsDirty)

  const { data: userCatalogItems = [] } = useGetCatalog()
  const { data: systemCatalogItems = [] } = useGetSystemCatalog()
  const { data: estimate, isLoading: isEstimateLoading } = useGetEstimate(estimateId ?? null)

  // Merge personal user catalog with system catalog library
  const catalogItems: CatalogItem[] = [
    ...userCatalogItems.map(it => ({ ...it, isFavorite: true })),
    ...systemCatalogItems
      .filter(
        sys =>
          !userCatalogItems.some(
            u => u.title.trim().toLowerCase() === sys.title.trim().toLowerCase()
          )
      )
      .map(sys => ({
        id: sys.id,
        title: sys.title,
        description: "",
        unit: sys.unit || "м²",
        category: sys.category || "Прочее",
        isFavorite: false,
        purchasePriceMinor: 0,
        sellingPriceMinor: 0,
        createdAt: "",
        updatedAt: "",
      })),
  ]

  const putEstimate = usePutEstimate()
  const patchEstimate = usePatchEstimate()
  const openPdf = useOpenEstimatePdf()
  const putCatalogItem = usePutCatalogItem()
  const deleteCatalogItem = useDeleteCatalogItem()

  const isPending = putEstimate.isPending || patchEstimate.isPending

  const [addCustomOpen, setAddCustomOpen] = useState(false)
  const [editingCatalogItem, setEditingCatalogItem] = useState<CatalogItem | null>(null)
  const [sendOpen, setSendOpen] = useState(false)
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [conflict, setConflict] = useState<Estimate | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [savedNotice, setSavedNotice] = useState(false)

  // Initialize draft: from existing estimate if available, or create fresh
  useEffect(() => {
    if (estimateId && estimate) {
      dispatch(setInitialDraft(estimate))
    } else if (!estimateId) {
      dispatch(startNewDraft({ projectId: project.id, currency: "RUB" }))
    }
    return () => {
      dispatch(resetEditor())
    }
  }, [estimateId, estimate, project.id, dispatch])

  // Save handler
  const handleSave = async (): Promise<boolean> => {
    const state = store.getState()
    const d = state.estimateEditor.draft
    if (!d) return false
    setErrorMessage(null)

    try {
      const isCreate = !estimateId && !state.estimateEditor.baseUpdatedAt
      let saved: Estimate
      if (isCreate || state.estimateEditor.itemsDirty) {
        saved = await putEstimate.mutateAsync({
          id: d.id,
          data: buildEstimateBody(d),
        })
      } else {
        const patch: EstimatePatch = {
          title: d.title,
          currency: d.currency,
          taxRateBp: d.taxRateBp,
          discountBp: d.discountBp,
          note: d.note,
        }
        saved = await patchEstimate.mutateAsync({ id: d.id, patch })
      }
      dispatch(setInitialDraft(saved))
      setSavedNotice(true)
      setTimeout(() => setSavedNotice(false), 2500)
      return true
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage("Не удалось сохранить смету")
      }
      return false
    }
  }

  // Handle adding an item from catalog
  const handleAddCatalogItem = (catalogItem: CatalogItem) => {
    if (!draft) return
    const existing = draft.items.find(
      it => it.title.trim().toLowerCase() === catalogItem.title.trim().toLowerCase()
    )
    if (existing) {
      dispatch(
        updateItem({
          id: existing.id,
          patch: { quantity: existing.quantity + 1 },
        })
      )
    } else {
      dispatch(addItems([fromCatalogItem(catalogItem, 1)]))
    }
  }

  // Handle adding custom position (adds to estimate and saves to personal catalog)
  const handleAddCustomItem = (
    item: EstimateItemInput,
    catalogInput?: CatalogItemInput
  ) => {
    dispatch(addItems([item]))
    if (catalogInput) {
      putCatalogItem.mutate({
        id: uuidv7(),
        data: catalogInput,
      })
    }
  }

  // Handle updating quantity directly
  const handleUpdateQuantity = (id: string, newQty: number) => {
    dispatch(updateItem({ id, patch: { quantity: newQty } }))
  }

  // Handle removing item
  const handleRemoveItem = (id: string) => {
    dispatch(removeItem(id))
  }

  // Handle PDF view/download
  const handleDownloadPdf = async () => {
    if (!draft) return
    let targetId = draft.id
    if (isDirty) {
      const savedOk = await handleSave()
      if (!savedOk) return
      targetId = draft.id
    }
    const popup = window.open("about:blank", "_blank")
    if (popup) showPdfLoadingPlaceholder(popup)
    openPdf.mutate({ id: targetId, popup, ensureSaved: async () => handleSave() })
  }

  // Handle back to project
  const handleBack = () => {
    if (onExit) {
      onExit()
    } else {
      navigate(`/projects/${project.id}`)
    }
  }

  if (estimateId && isEstimateLoading) {
    return (
      <div className="container-fluid py-5 d-flex justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Загрузка сметы...</span>
        </div>
      </div>
    )
  }

  if (!draft) return null

  const editItem = editItemId
    ? draft.items.find(it => it.id === editItemId) ?? null
    : null

  const customerSubtitle = [
    project.objectAddress || project.title || "Объект",
    project.customer || "Заказчик",
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="estimate-builder-layout">
      {/* Back button */}
      <div>
        <button
          type="button"
          className="btn btn-link text-secondary text-decoration-none fw-semibold p-0 d-inline-flex align-items-center gap-2"
          onClick={handleBack}
        >
          <i className="bi bi-arrow-left" />
          <span>К заказу</span>
        </button>
      </div>

      {/* Screen Title & Subtitle */}
      <div className="builder-header">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h2 className="fw-bold mb-0">Смета</h2>
            <div className="text-secondary small">{customerSubtitle}</div>
          </div>
          {savedNotice && (
            <span className="badge bg-success-subtle text-success py-2 px-3 fw-medium">
              <i className="bi bi-check2 me-1" /> Сохранено
            </span>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="alert alert-danger py-2 px-3 small mb-0" role="alert">
          {errorMessage}
        </div>
      )}

      {openPdf.error && (
        <div className="alert alert-danger py-2 px-3 small mb-0" role="alert">
          {pdfErrorMessage(openPdf.error)}
        </div>
      )}

      {/* 2-Column Workspace */}
      <div className="builder-workspace">
        {/* Left: Catalog and search */}
        <CatalogPickerSection
          catalogItems={catalogItems}
          currentEstimateItems={draft.items}
          onAddItem={handleAddCatalogItem}
          onEditCatalogItem={item => setEditingCatalogItem(item)}
          onOpenAddCustom={() => setAddCustomOpen(true)}
        />

        {/* Right: Estimate cart panel */}
        <EstimateCartSection
          items={draft.items}
          totals={totals ?? computeTotals([], 0, 0)}
          currency={draft.currency}
          isDirty={isDirty}
          isPending={isPending}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onEditItem={id => setEditItemId(id)}
          onSend={() => setSendOpen(true)}
          onDownloadPdf={handleDownloadPdf}
          onSave={() => void handleSave()}
        />
      </div>

      {/* Modals */}
      {addCustomOpen && (
        <AddCustomPositionModal
          onAdd={handleAddCustomItem}
          onClose={() => setAddCustomOpen(false)}
        />
      )}

      {editingCatalogItem && (
        <EditCatalogItemModal
          item={editingCatalogItem}
          onSave={(id, data) => {
            putCatalogItem.mutate({ id, data })
          }}
          onDelete={id => {
            deleteCatalogItem.mutate(id)
          }}
          onClose={() => setEditingCatalogItem(null)}
        />
      )}

      {sendOpen && (
        <SendEstimateModal
          project={project}
          estimateId={draft.id}
          onEnsureSaved={handleSave}
          onClose={() => setSendOpen(false)}
          onSuccessDone={() => {
            setSendOpen(false)
            handleBack()
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
          onDelete={id => {
            dispatch(removeItem(id))
            setEditItemId(null)
          }}
          onClose={() => setEditItemId(null)}
        />
      )}

      {conflict && (
        <SaveConflictModal
          title="Смета изменилась в другом окне"
          updatedAt={conflict.updatedAt}
          onClose={() => setConflict(null)}
          onRead={() => {
            setConflict(null)
            if (estimateId) {
              dispatch(setInitialDraft(conflict))
            }
          }}
          onOverwrite={() => {
            setConflict(null)
            void handleSave()
          }}
        />
      )}
    </div>
  )
}
