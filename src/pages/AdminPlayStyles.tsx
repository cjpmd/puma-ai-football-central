import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/contexts/AuthorizationContext';
import { useNavigate } from 'react-router-dom';
import { PlayStyle, playStylesService, getIconDisplay } from '@/types/playStyles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Upload, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function AdminPlayStyles() {
  const { user } = useAuth();
  const { isGlobalAdmin } = useAuthorization();
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
      navigate('/auth');
      return;
    }
    
    if (!isGlobalAdmin) {
      toast.error('Unauthorized', {
        description: 'Only global admins can access this page',
      });
      navigate('/dashboard');
      return;
    }

    loadPlayStyles();
  }, [user, isGlobalAdmin, navigate]);

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

    // Upload image if provided
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
        toast.success('Play style updated successfully');
        loadPlayStyles();
        handleCloseDialog();
      } else {
        toast.error('Failed to update play style');
      }
    } else {
      const created = await playStylesService.createPlayStyle(styleData);
      if (created) {
        toast.success('Play style created successfully');
        loadPlayStyles();
        handleCloseDialog();
      } else {
        toast.error('Failed to create play style');
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
      toast.success('Play style deleted successfully');
      loadPlayStyles();
    } else {
      toast.error('Failed to delete play style');
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Play Styles Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage platform-wide play styles for all users
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Play Style
        </Button>
      </div>

      <Tabs defaultValue="attacker" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="attacker">Attacker</TabsTrigger>
          <TabsTrigger value="midfielder">Midfielder</TabsTrigger>
          <TabsTrigger value="defender">Defender</TabsTrigger>
          <TabsTrigger value="goalkeeper">Goalkeeper</TabsTrigger>
        </TabsList>

        {(['attacker', 'midfielder', 'defender', 'goalkeeper'] as const).map(category => (
          <TabsContent key={category} value={category} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedStyles[category]?.map(style => (
                <Card key={style.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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
                        <CardTitle className="text-base">{style.label}</CardTitle>
                        <Badge variant="outline" className="text-xs mt-1">
                          {style.value}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(style)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(style)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Badge variant={style.icon_type === 'image' ? 'default' : 'secondary'}>
                      {style.icon_type === 'image' ? 'Image' : 'Emoji'}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {(!groupedStyles[category] || groupedStyles[category].length === 0) && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No play styles in this category yet
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStyle ? 'Edit Play Style' : 'Add New Play Style'}
            </DialogTitle>
            <DialogDescription>
              {editingStyle ? 'Update play style details' : 'Create a new play style for all users'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="value">Value (slug)*</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                placeholder="e.g., finisher"
                disabled={!!editingStyle}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">Label (display name)*</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Finisher"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category*</Label>
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
              <Label>Icon Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
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
                <Label htmlFor="emoji">Emoji</Label>
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
                <Label htmlFor="image">Upload Image</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="image"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleImageUpload}
                    className="flex-1"
                  />
                  {imagePreview && (
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="w-12 h-12 object-contain" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute -top-2 -right-2 h-5 w-5"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG or JPEG, max 500KB. Recommended: 128x128px
                </p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {editingStyle ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Play Style</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{styleToDelete?.label}"? This will hide it from all users.
              Existing player data will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStyleToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
