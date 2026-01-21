export default function ChatPage() {
    return (
        <div className="flex h-full items-center justify-center bg-gray-50 text-center p-8">
            <div className="max-w-md">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
                    <svg className="h-10 w-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <h2 className="mb-2 text-2xl font-bold text-gray-900">Select a Conversation</h2>
                <p className="text-gray-500">
                    Choose a contact from the sidebar to start messaging or create a new chat.
                </p>
            </div>
        </div>
    );
}
