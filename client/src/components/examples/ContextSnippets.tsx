import ContextSnippets from "../ContextSnippets";

export default function ContextSnippetsExample() {
  const mockSnippets = [
    {
      text: "Neural networks are computing systems inspired by biological neural networks. They consist of interconnected nodes called neurons that process information in layers.",
      pageNumber: 12,
      score: 0.94
    },
    {
      text: "Deep learning is a subset of machine learning that uses neural networks with multiple layers to progressively extract higher-level features from raw input.",
      pageNumber: 15,
      score: 0.87
    },
    {
      text: "Convolutional Neural Networks (CNNs) are specifically designed for processing grid-like data such as images, using convolutional layers to detect patterns.",
      pageNumber: 23,
      score: 0.81
    }
  ];

  return (
    <div className="p-6 max-w-2xl">
      <ContextSnippets snippets={mockSnippets} />
    </div>
  );
}
