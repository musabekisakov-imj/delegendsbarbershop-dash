import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useT } from '../../hooks/use-t';
import type { ProductCategory } from '../../types';

export interface ProductForm {
  name: string;
  brand: string;
  size: string;
  price: string;
  stock: string;
  category: ProductCategory;
  description: string;
  imageUrl: string;
  isPublic: boolean;
}

export const emptyForm: ProductForm = {
  name: '',
  brand: '',
  size: '',
  price: '',
  stock: '0',
  category: 'hair-care',
  description: '',
  imageUrl: '',
  isPublic: true,
};

const CATEGORIES: ProductCategory[] = ['hair-care', 'face-body', 'beards', 'hairdressing-supplies'];

export function ProductEditorModal({
  open, onOpenChange, mode, form, setForm, isSubmitting, onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  form: ProductForm;
  setForm: React.Dispatch<React.SetStateAction<ProductForm>>;
  isSubmitting: boolean;
  onSave: () => void;
}) {
  const t = useT();
  const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? t('products.editor.editTitle') : t('products.editor.createTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">{t('products.editor.fields.name')}</Label>
            <Input id="p-name" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-brand">{t('products.editor.fields.brand')}</Label>
              <Input id="p-brand" value={form.brand} onChange={(e) => set('brand', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-size">{t('products.editor.fields.size')}</Label>
              <Input id="p-size" value={form.size} onChange={(e) => set('size', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-price">{t('products.editor.fields.price')}</Label>
              <Input id="p-price" type="number" inputMode="decimal" min="0" step="0.01"
                value={form.price} onChange={(e) => set('price', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-stock">{t('products.editor.fields.stock')}</Label>
              <Input id="p-stock" type="number" inputMode="numeric" min="0" step="1"
                value={form.stock} onChange={(e) => set('stock', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t('products.editor.fields.category')}</Label>
            <Select value={form.category} onValueChange={(v) => set('category', v as ProductCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>
                    {t(`products.category.${c}` as Parameters<typeof t>[0])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-desc">{t('products.editor.fields.description')}</Label>
            <Textarea id="p-desc" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-img">{t('products.editor.fields.image')}</Label>
            <Input id="p-img" value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://..." />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <Label htmlFor="p-public" className="cursor-pointer">{t('products.editor.fields.visibility')}</Label>
            <Switch id="p-public" checked={form.isPublic} onCheckedChange={(v) => set('isPublic', v)} />
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onSave} disabled={isSubmitting}>
            {t('products.editor.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
