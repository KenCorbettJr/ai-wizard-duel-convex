"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useUser } from '@clerk/nextjs';

interface CreateWizardFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateWizardForm({ onClose, onSuccess }: CreateWizardFormProps) {
  const { user } = useUser();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isAIPowered: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createWizard = useMutation(api.wizards.createWizard);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !formData.name.trim() || !formData.description.trim()) return;
    
    setIsSubmitting(true);
    try {
      await createWizard({
        owner: user.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        isAIPowered: formData.isAIPowered,
      });
      
      setFormData({ name: '', description: '', isAIPowered: false });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to create wizard:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Wizard</CardTitle>
        <CardDescription>Design your magical companion</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Wizard Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter wizard name..."
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg h-24 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Describe your wizard's abilities and personality..."
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAIPowered"
              checked={formData.isAIPowered}
              onChange={(e) => setFormData(prev => ({ ...prev, isAIPowered: e.target.checked }))}
              className="rounded"
              disabled={isSubmitting}
            />
            <label htmlFor="isAIPowered" className="text-sm font-medium">
              🤖 AI-Powered Wizard
            </label>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.name.trim() || !formData.description.trim()}
              className="flex-1"
            >
              {isSubmitting ? 'Creating...' : 'Create Wizard'}
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}