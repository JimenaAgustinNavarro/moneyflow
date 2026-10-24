'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { CategoryFormModal } from '@/components/categories/CategoryFormModal';
import { CategoryTree } from '@/components/categories/CategoryTree';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/hooks/useCategories';
import { ApiError } from '@/lib/api-client';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@/types/category';

interface Notice {
  message: string;
  isError: boolean;
}

export default function CategoriesPage() {
  const categoriesQuery = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const categories = categoriesQuery.data ?? [];

  const showError = (error: unknown, fallback: string) => {
    setNotice({
      message: error instanceof ApiError || error instanceof Error ? error.message : fallback,
      isError: true,
    });
  };

  const handleCreate = async (input: CreateCategoryInput) => {
    await createCategory.mutateAsync(input);
    setNotice({ message: 'Categoría creada.', isError: false });
  };

  const handleEdit = async (input: UpdateCategoryInput) => {
    if (!editing) return;
    await updateCategory.mutateAsync({ id: editing.id, input });
    setNotice({ message: 'Categoría actualizada.', isError: false });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    try {
      await deleteCategory.mutateAsync(pendingDelete.id);
      setNotice({ message: 'Categoría eliminada.', isError: false });
      setPendingDelete(null);
    } catch (error) {
      showError(error, 'No se pudo eliminar la categoría.');
      setPendingDelete(null);
    }
  };

  const income = categories.filter((category) => category.type === 'INCOME');
  const expense = categories.filter((category) => category.type === 'EXPENSE');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Categorías</h1>
          <p className="text-sm text-muted-foreground">
            Administra tus categorías de ingresos y egresos.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
          Nueva categoría
        </Button>
      </div>

      {notice && (
        <p
          role={notice.isError ? 'alert' : 'status'}
          className={`rounded-md p-3 text-sm ${
            notice.isError ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
          }`}
        >
          {notice.message}
        </p>
      )}

      {categoriesQuery.isPending && (
        <p role="status" className="text-sm text-muted-foreground">
          Cargando categorías...
        </p>
      )}

      {categoriesQuery.isError && (
        <p role="alert" className="text-sm text-destructive">
          {categoriesQuery.error instanceof Error
            ? categoriesQuery.error.message
            : 'No se pudieron cargar las categorías.'}
        </p>
      )}

      {categoriesQuery.isSuccess && categories.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay categorías todavía. Crea la primera.</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <CategorySection
          title="Ingresos"
          emptyMessage="Sin categorías de ingreso."
          categories={income}
          onEdit={(category) => {
            setEditing(category);
            setFormOpen(true);
          }}
          onDelete={setPendingDelete}
        />
        <CategorySection
          title="Egresos"
          emptyMessage="Sin categorías de egreso."
          categories={expense}
          onEdit={(category) => {
            setEditing(category);
            setFormOpen(true);
          }}
          onDelete={setPendingDelete}
        />
      </div>

      <CategoryFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmitCreate={handleCreate}
        onSubmitEdit={handleEdit}
        categories={categories}
        editing={editing}
      />

      <ConfirmationModal
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Eliminar categoría"
        description={`¿Seguro que quieres eliminar "${pendingDelete?.name ?? ''}"? Esta acción se puede deshacer restaurándola.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        variant="destructive"
        isLoading={deleteCategory.isPending}
      />
    </div>
  );
}

function CategorySection({
  title,
  emptyMessage,
  categories,
  onEdit,
  onDelete,
}: {
  title: string;
  emptyMessage: string;
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}) {
  return (
    <Card className="border border-border/80 bg-card/80">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <CategoryTree categories={categories} onEdit={onEdit} onDelete={onDelete} />
        )}
      </CardContent>
    </Card>
  );
}
