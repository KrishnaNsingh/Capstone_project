import DocumentInfo from "../DocumentInfo";

export default function DocumentInfoExample() {
  return (
    <div className="p-6 space-y-4 max-w-md">
      <DocumentInfo
        fileName="Machine Learning Guide.pdf"
        pageCount={42}
        uploadedAt={new Date()}
        onRemove={() => console.log("Remove clicked")}
      />
      
      <DocumentInfo
        fileName="Very Long Document Name That Should Truncate Properly.pdf"
        pageCount={1}
        uploadedAt={new Date()}
      />
    </div>
  );
}
