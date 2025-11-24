import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/contexts/AuthorizationContext';
import { useNavigate } from 'react-router-dom';
import { PlayStyle, playStylesService } from '@/types/playStyles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function AdminPlayStylesMobile() {
  const { user, profile, loading: profileLoading } = useAuth();
  const { isGlobalAdmin, loading: authzLoading } = useAuthorization();
  const navigate = useNavigate();
  
  const [playStyles, setPlayStyles] = useState<PlayStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState<PlayStyle | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [styleToDelete, setStyleToDelete] = useState<PlayStyle | null>(null);
  
  const [formData, setFormData] = useState({
    value: '',
    label: '',
    category: 'attacker' as PlayStyle['category'],
    icon_type: 'emoji' as 'emoji' | 'image',
    icon_emoji: '⚽',
    icon_image_url: '',
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth-mobile');
      return;
    }
    
    // Wait for both profile AND authorization to load
    if (authzLoading || profileLoading || !profile) return;
    
    if (!isGlobalAdmin) {
      toast.error('Unauthorized');
      navigate('/dashboard-mobile');
      return;
    }

    loadPlayStyles();
  }, [user, profile, profileLoading, isGlobalAdmin, authzLoading, navigate]);

  const loadPlayStyles = async () => {
    setLoading(true);
    const styles = await playStylesService.getAllPlayStyles();
    setPlayStyles(styles);
    setLoading(false);
  };

  const handleOpenDialog = (style?: PlayStyle) => {
    if (style) {
      setEditingStyle(style);
      setFormData({
        value: style.value,
        label: style.label,
        category: style.category,
        icon_type: style.icon_type,
        icon_emoji: style.icon_emoji || '⚽',
        icon_image_url: style.icon_image_url || '',
      });
      if (style.icon_type === 'image' && style.icon_image_url) {
        setImagePreview(style.icon_image_url);
      }
    } else {
      setEditingStyle(null);
      setFormData({
        value: '',
        label: '',
        category: 'attacker',
        icon_type: 'emoji',
        icon_emoji: '⚽',
        icon_image_url: '',
      });
      setImageFile(null);
      setImagePreview(null);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingStyle(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 500000) {
      toast.error('Image must be less than 500KB');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setFormData(prev => ({ ...prev, icon_type: 'image' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.value || !formData.label) {
      toast.error('Please fill in all required fields');
      return;
    }

    let iconImageUrl = formData.icon_image_url;

    if (imageFile && formData.icon_type === 'image') {
      const uploadedUrl = await playStylesService.uploadPlayStyleImage(imageFile, formData.value);
      if (uploadedUrl) {
        iconImageUrl = uploadedUrl;
      } else {
        toast.error('Failed to upload image');
        return;
      }
    }

    const styleData = {
      ...formData,
      icon_image_url: iconImageUrl,
      icon_emoji: formData.icon_type === 'emoji' ? formData.icon_emoji : undefined,
    };

    if (editingStyle) {
      const updated = await playStylesService.updatePlayStyle(editingStyle.id!, styleData);
      if (updated) {
        toast.success('Play style updated');
        loadPlayStyles();
        handleCloseDialog();
      } else {
        toast.error('Failed to update');
      }
    } else {
      const created = await playStylesService.createPlayStyle(styleData);
      if (created) {
        toast.success('Play style created');
        loadPlayStyles();
        handleCloseDialog();
      } else {
        toast.error('Failed to create');
      }
    }
  };

  const handleDeleteClick = (style: PlayStyle) => {
    setStyleToDelete(style);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!styleToDelete) return;

    const success = await playStylesService.deletePlayStyle(styleToDelete.id!);
    if (success) {
      toast.success('Deleted successfully');
      loadPlayStyles();
    } else {
      toast.error('Failed to delete');
    }
    
    setDeleteDialogOpen(false);
    setStyleToDelete(null);
  };

  const groupedStyles = playStyles.reduce((acc, style) => {
    if (!acc[style.category]) {
      acc[style.category] = [];
    }
    acc[style.category].push(style);
    return acc;
  }, {} as Record<string, PlayStyle[]>);

  if (authzLoading || profileLoading || !profile || loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Play Styles</h1>
          <p className="text-sm text-muted-foreground">Manage platform styles</p>
        </div>
        <Button size="sm" onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <Tabs defaultValue="attacker" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="attacker" className="text-xs">ATT</TabsTrigger>
          <TabsTrigger value="midfielder" className="text-xs">MID</TabsTrigger>
          <TabsTrigger value="defender" className="text-xs">DEF</TabsTrigger>
          <TabsTrigger value="goalkeeper" className="text-xs">GK</TabsTrigger>
        </TabsList>

        {(['attacker', 'midfielder', 'defender', 'goalkeeper'] as const).map(category => (
          <TabsContent key={category} value={category} className="space-y-2 mt-4">
            {groupedStyles[category]?.map(style => (
              <Card key={style.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
                  <div className="flex items-center gap-3">
                    {style.icon_type === 'image' && style.icon_image_url ? (
                      <img 
                        src={style.icon_image_url} 
                        alt={style.label}
                        className="w-8 h-8 object-contain"
                      />
                    ) : (
                      <span className="text-2xl">{style.icon_emoji}</span>
                    )}
                    <div>
                      <CardTitle className="text-sm">{style.label}</CardTitle>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {style.value}
                        </Badge>
                        <Badge variant={style.icon_type === 'image' ? 'default' : 'secondary'} className="text-xs">
                          {style.icon_type === 'image' ? 'Image' : 'Emoji'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenDialog(style)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteClick(style)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
            
            {(!groupedStyles[category] || groupedStyles[category].length === 0) && (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No styles yet
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingStyle ? 'Edit' : 'Add'} Play Style
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="value" className="text-sm">Value*</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                placeholder="finisher"
                disabled={!!editingStyle}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="label" className="text-sm">Label*</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Finisher"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm">Category*</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as PlayStyle['category'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attacker">Attacker</SelectItem>
                  <SelectItem value="midfielder">Midfielder</SelectItem>
                  <SelectItem value="defender">Defender</SelectItem>
                  <SelectItem value="goalkeeper">Goalkeeper</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Icon Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={formData.icon_type === 'emoji' ? 'default' : 'outline'}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, icon_type: 'emoji' }));
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="flex-1"
                >
                  Emoji
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={formData.icon_type === 'image' ? 'default' : 'outline'}
                  onClick={() => setFormData(prev => ({ ...prev, icon_type: 'image' }))}
                  className="flex-1"
                >
                  Image
                </Button>
              </div>
            </div>

            {formData.icon_type === 'emoji' ? (
              <div className="space-y-2">
                <Label htmlFor="emoji" className="text-sm">Emoji</Label>
                <Input
                  id="emoji"
                  value={formData.icon_emoji}
                  onChange={(e) => setFormData(prev => ({ ...prev, icon_emoji: e.target.value }))}
                  placeholder="⚽"
                  maxLength={2}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="image" className="text-sm">Upload Image</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleImageUpload}
                />
                {imagePreview && (
                  <div className="flex items-center gap-2">
                    <img src={imagePreview} alt="Preview" className="w-12 h-12 object-contain" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  PNG/JPEG, max 500KB
                </p>
              </div>
            )}

            <DialogFooter className="flex-row gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                {editingStyle ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{styleToDelete?.label}"? Existing player data won't be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
