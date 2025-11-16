import PDFUploadZone from "../PDFUploadZone";

export default function PDFUploadZoneExample() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Default State</h3>
        <PDFUploadZone 
          onFileSelect={(file) => console.log("File selected:", file.name)} 
        />
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-2">Uploading State</h3>
        <PDFUploadZone 
          onFileSelect={(file) => console.log("File selected:", file.name)}
          isUploading={true}
        />
      </div>
    </div>
  );
}
