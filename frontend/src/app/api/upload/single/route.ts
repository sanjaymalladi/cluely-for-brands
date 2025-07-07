import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('📤 Processing file upload:', file.name);
    console.log('📄 File size:', file.size);
    console.log('📄 File type:', file.type);

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const filename = `upload_${timestamp}_${randomString}.${fileExtension}`;

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filepath = join(uploadsDir, filename);

    await writeFile(filepath, buffer);

    // Return the public URL
    const url = `/uploads/${filename}`;
    const fullUrl = `${new URL(request.url).origin}${url}`;

    console.log('✅ File uploaded successfully:', filename);

    return NextResponse.json({
      url: fullUrl,
      filename: file.name,
      savedAs: filename,
      size: file.size,
      mimetype: file.type
    });

  } catch (error) {
    console.error('❌ Error uploading file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `File upload failed: ${errorMessage}` },
      { status: 500 }
    );
  }
} 