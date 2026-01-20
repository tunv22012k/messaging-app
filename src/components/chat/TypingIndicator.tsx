export default function TypingIndicator() {
    return (
        <div className="flex w-16 items-center space-x-1 rounded-2xl bg-gray-200 px-4 py-3">
            <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500"></div>
        </div>
    );
}
