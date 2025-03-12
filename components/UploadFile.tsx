"use client";

import { Button } from "@/components/ui/button";
import { File } from "lucide-react";

import { FileUploadResult } from "@/app/types";

interface UploadFileProps {
  onUploadResult: (result: FileUploadResult) => void;
  uploading: boolean;
  setUploading: (uploading: boolean) => void;
}

export const UploadFile: React.FC<UploadFileProps> = ({onUploadResult, uploading, setUploading}) => {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploading(true);
      const formData = new FormData();
      Object.values(e.target.files).forEach((file) => {
        formData.append("file", file);
      });

      try {
        const response = await fetch("/api/files", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        console.log("Upload result:", result);
        onUploadResult(result);
        if (result.fileId) {
          alert("Upload ok : " + `file id is ${result.fileId}`);
          setUploading(false);
        } else {
          alert("Upload failed");
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        alert("Error uploading file");
      }finally {
          setUploading(false);
        }

    }
  };
  return (
    <div>
      <input
        type="file"
        name="file"
        id="upload-file"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <label htmlFor="upload-file">
        {uploading ? (
          <Button disabled asChild>
          <div>
            <File />
            Please wait...
          </div>
        </Button>
        ) : (

          <Button asChild>
          <div>
            <File />
            Upload
          </div>
          </Button>
        )
        }
      </label>
    </div>
  );
};
