import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const instructions = [
  {
    title: "Case Study: Boston Metro School District",
    content: "This interactive case study allows you to explore the transportation challenges facing BMSD through conversations with key stakeholders. You'll be able to understand different perspectives and work towards finding solutions."
  },
  {
    title: "How to Use This Tool",
    content: "Start by chatting with Dr. Emily Carter, our Superintendent, who will provide an overview of the situation. You can then switch between different stakeholders using the character selector to understand their unique perspectives."
  },
  {
    title: "Key Stakeholders",
    content: "You can interact with:\n- Dr. Emily Carter (Superintendent)\n- Ms. Sarah Lee (Chief Operations Officer)\n- Mr. James Thompson (CFO)\n- Mr. David Rodriguez (Principal)\n- Ms. Linda Johnson (Bus Driver)"
  },
  {
    title: "Making Progress",
    content: "Ask questions about their concerns, challenges, and proposed solutions. Each stakeholder has unique insights that will help you understand the full scope of the transportation crisis."
  },
  {
    title: "Getting Started",
    content: "Begin by asking Dr. Carter about the current state of BMSD's transportation system. She can provide context about the challenges and help guide your investigation."
  }
];

export default function InstructionsPopup() {
  const [isOpen, setIsOpen] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen) return null;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % instructions.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + instructions.length) % instructions.length);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 relative">
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">{instructions[currentIndex].title}</h2>
          <p className="text-gray-700 whitespace-pre-line">{instructions[currentIndex].content}</p>
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={prevSlide}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="flex gap-2">
            {instructions.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentIndex ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={nextSlide}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    </div>
  );
} 