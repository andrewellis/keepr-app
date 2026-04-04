import { AmazonImportUploader } from './amazon-import-uploader';

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Import Order History</h1>
      <p className="mb-8 text-sm text-gray-500">
        Upload your Amazon Order History CSV to automatically track repeat purchases.
        K33pr will check prices weekly and alert you when they drop.
      </p>
      <AmazonImportUploader />
    </div>
  );
}
