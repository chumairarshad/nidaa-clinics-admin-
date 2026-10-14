import React from 'react';
import PostEditor from '@/components/PostEditor';

export const metadata = {
  title: 'Compose New Article | NiDAA Clinic CMS',
};

export default function NewPostPage() {
  return <PostEditor isEditMode={false} />;
}
