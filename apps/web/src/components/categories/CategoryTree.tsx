'use client';

import {
  Briefcase,
  CarFront,
  CirclePlus,
  Ellipsis,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  House,
  Pencil,
  Receipt,
  Tag,
  TrendingUp,
  Trash2,
  Utensils,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Category } from '@/types/category';

interface CategoryTreeProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

interface CategoryNodeProps {
  category: Category;
  level: 1 | 2;
  hasChildren: boolean;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

const categoryIcons: Record<string, LucideIcon> = {
  wallet: Wallet,
  briefcase: Briefcase,
  'trending-up': TrendingUp,
  'plus-circle': CirclePlus,
  home: House,
  utensils: Utensils,
  car: CarFront,
  'heart-pulse': HeartPulse,
  'gamepad-2': Gamepad2,
  'graduation-cap': GraduationCap,
  receipt: Receipt,
  'more-horizontal': Ellipsis,
};

function CategoryNode({ category, level, hasChildren, onEdit, onDelete }: CategoryNodeProps) {
  const Icon = category.icon ? (categoryIcons[category.icon] ?? Tag) : Tag;

  return (
    <li
      role="treeitem"
      aria-level={level}
      aria-selected={false}
      aria-expanded={hasChildren ? true : undefined}
      className={`flex items-center justify-between rounded-lg px-3 py-2 transition hover:bg-accent/50 ${
        level === 2 ? 'ml-6' : ''
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon
          aria-hidden="true"
          className="h-4 w-4 shrink-0"
          style={{ color: category.color ?? undefined }}
        />
        <span className="truncate text-sm text-foreground">{category.name}</span>
        {category.isSystem && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            Sistema
          </span>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onEdit(category)}
          disabled={category.isSystem}
          aria-label={`Editar ${category.name}`}
          title={category.isSystem ? 'Categoría del sistema' : undefined}
        >
          <Pencil aria-hidden="true" className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onDelete(category)}
          disabled={category.isSystem}
          aria-label={`Borrar ${category.name}`}
          title={category.isSystem ? 'Categoría del sistema' : undefined}
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

export function CategoryTree({ categories, onEdit, onDelete }: CategoryTreeProps) {
  const roots = categories.filter((category) => category.parentId === null);
  const childrenByParent = categories.reduce<Record<string, Category[]>>((grouped, category) => {
    if (category.parentId) {
      grouped[category.parentId] ??= [];
      grouped[category.parentId].push(category);
    }
    return grouped;
  }, {});

  return (
    <ul role="tree" aria-label="Categorías" className="space-y-1">
      {roots.map((root) => {
        const children = childrenByParent[root.id] ?? [];

        return (
          <li key={root.id} role="none">
            <ul role="group" className="space-y-1">
              <CategoryNode
                category={root}
                level={1}
                hasChildren={children.length > 0}
                onEdit={onEdit}
                onDelete={onDelete}
              />
              {children.map((child) => (
                <CategoryNode
                  key={child.id}
                  category={child}
                  level={2}
                  hasChildren={false}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
