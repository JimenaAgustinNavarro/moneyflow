'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiError } from '@/lib/api-client';
import type {
  Category,
  CategoryType,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/types/category';

const createSchema = z.object({
  name: z.string().trim().min(1, 'Ingresa un nombre.').max(60, 'Máximo 60 caracteres.'),
  type: z.enum(['INCOME', 'EXPENSE']),
  parentId: z.string().nullable().optional(),
  icon: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color hex inválido.')
    .optional()
    .or(z.literal('')),
});

const editSchema = z.object({
  name: z.string().trim().min(1, 'Ingresa un nombre.').max(60, 'Máximo 60 caracteres.'),
  icon: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color hex inválido.')
    .optional()
    .or(z.literal('')),
});

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;

interface CategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitCreate: (input: CreateCategoryInput) => Promise<void>;
  onSubmitEdit: (input: UpdateCategoryInput) => Promise<void>;
  categories: Category[];
  editing: Category | null;
}

export function CategoryFormModal({
  open,
  onClose,
  onSubmitCreate,
  onSubmitEdit,
  categories,
  editing,
}: CategoryFormModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', type: 'EXPENSE', parentId: null, icon: '', color: '' },
  });
  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: '', icon: '', color: '' },
  });
  const selectedType = createForm.watch('type');
  const parentOptions = categories.filter(
    (category) =>
      category.type === selectedType && category.parentId === null && !category.isSystem,
  );

  useEffect(() => {
    if (open && editing) {
      editForm.reset({
        name: editing.name,
        icon: editing.icon ?? '',
        color: editing.color ?? '',
      });
    } else if (open) {
      createForm.reset({ name: '', type: 'EXPENSE', parentId: null, icon: '', color: '' });
    }
    setServerError(null);
  }, [open, editing, createForm, editForm]);

  const setSubmissionError = (error: unknown) => {
    setServerError(error instanceof ApiError ? error.message : 'No se pudo guardar la categoría.');
  };

  const submitCreate = createForm.handleSubmit(async (data) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      await onSubmitCreate({
        name: data.name,
        type: data.type,
        parentId: data.parentId ?? null,
        icon: data.icon || null,
        color: data.color || null,
      });
      onClose();
    } catch (error) {
      setSubmissionError(error);
    } finally {
      setIsSubmitting(false);
    }
  });

  const submitEdit = editForm.handleSubmit(async (data) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      await onSubmitEdit({
        name: data.name,
        icon: data.icon || null,
        color: data.color || null,
      });
      onClose();
    } catch (error) {
      setSubmissionError(error);
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
        </DialogHeader>
        {serverError && (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {serverError}
          </p>
        )}
        {editing ? (
          <form onSubmit={submitEdit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="edit-category-name">Nombre</Label>
              <Input id="edit-category-name" {...editForm.register('name')} />
              {editForm.formState.errors.name && (
                <p className="text-xs text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category-icon">Ícono (opcional)</Label>
              <Input id="edit-category-icon" {...editForm.register('icon')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category-color">Color (opcional)</Label>
              <Input
                id="edit-category-color"
                placeholder="#10b981"
                {...editForm.register('color')}
              />
              {editForm.formState.errors.color && (
                <p className="text-xs text-destructive">
                  {editForm.formState.errors.color.message}
                </p>
              )}
            </div>
            <FormActions onClose={onClose} isSubmitting={isSubmitting} submitLabel="Guardar" />
          </form>
        ) : (
          <form onSubmit={submitCreate} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="create-category-name">Nombre</Label>
              <Input id="create-category-name" {...createForm.register('name')} />
              {createForm.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-category-type">Tipo</Label>
              <Controller
                control={createForm.control}
                name="type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value: CategoryType) => {
                      field.onChange(value);
                      createForm.setValue('parentId', null);
                    }}
                  >
                    <SelectTrigger id="create-category-type" className="w-full">
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INCOME">Ingreso</SelectItem>
                      <SelectItem value="EXPENSE">Egreso</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-category-parent">Categoría padre (opcional)</Label>
              <Controller
                control={createForm.control}
                name="parentId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? '__none__'}
                    onValueChange={(value) => field.onChange(value === '__none__' ? null : value)}
                  >
                    <SelectTrigger id="create-category-parent" className="w-full">
                      <SelectValue placeholder="Sin padre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin padre</SelectItem>
                      {parentOptions.map((parent) => (
                        <SelectItem key={parent.id} value={parent.id}>
                          {parent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-category-icon">Ícono (opcional)</Label>
              <Input id="create-category-icon" {...createForm.register('icon')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-category-color">Color (opcional)</Label>
              <Input
                id="create-category-color"
                placeholder="#10b981"
                {...createForm.register('color')}
              />
              {createForm.formState.errors.color && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.color.message}
                </p>
              )}
            </div>
            <FormActions
              onClose={onClose}
              isSubmitting={isSubmitting}
              submitLabel="Crear categoría"
            />
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormActions({
  onClose,
  isSubmitting,
  submitLabel,
}: {
  onClose: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
        Cancelar
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Guardando...' : submitLabel}
      </Button>
    </div>
  );
}
