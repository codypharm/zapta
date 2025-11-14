import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { extractText } from "unpdf";

/**
 * API endpoint for server-side file text extraction
 * Handles PDF and DOCX files that require Node.js APIs
 * Uses unpdf for reliable, modern PDF parsing
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Check file type
    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();

    let extractedText = "";

    if (fileName.endsWith(".pdf")) {
      // Extract text from PDF using unpdf - simple and reliable
      try {
        // unpdf requires Uint8Array, not Buffer
        const uint8Array = new Uint8Array(arrayBuffer);
        const { text } = await extractText(uint8Array, { mergePages: true });
        extractedText = text;

        if (!extractedText.trim()) {
          throw new Error("No text could be extracted from this PDF. It may be image-based or encrypted.");
        }
      } catch (error) {
        console.error("PDF extraction error:", error);
        throw new Error(
          error instanceof Error
            ? `PDF extraction failed: ${error.message}`
            : "Failed to extract text from PDF"
        );
      }
    } else if (fileName.endsWith(".docx")) {
      // Extract text from DOCX using mammoth (Node.js only)
      const mammoth = await import("mammoth");
      const buffer = Buffer.from(arrayBuffer);
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Only PDF and DOCX are supported for server-side extraction." },
        { status: 400 }
      );
    }

    // Return extracted text
    return NextResponse.json({
      success: true,
      text: extractedText,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error) {
    console.error("File extraction error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Extraction failed: ${error.message}`
            : "An unknown error occurred during file extraction",
      },
      { status: 500 }
    );
  }
}
