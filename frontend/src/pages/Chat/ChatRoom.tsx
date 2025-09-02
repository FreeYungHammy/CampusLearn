const ChatRoom = () => {
  return (
    <div className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-base font-semibold text-bc-blue tracking-wide uppercase">
            Chat
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Connect with Tutors Instantly
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
            Private messaging for one-on-one academic support.
          </p>
        </div>

        <div className="mt-12 bg-gray-50 rounded-xl shadow-lg overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Contacts Sidebar */}
            <div className="w-full md:w-1/3 bg-white border-r border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Conversations
                </h3>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
                {/* Contact 1 */}
                <div className="p-4 border-b border-gray-200 hover:bg-blue-50 cursor-pointer">
                  <div className="flex items-center">
                    <img
                      className="h-10 w-10 rounded-full"
                      src="https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                      alt=""
                    />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        Sarah Johnson
                      </p>
                      <p className="text-sm text-gray-500">
                        BCom IT • Programming
                      </p>
                    </div>
                    <div className="ml-auto text-xs text-gray-500">2h ago</div>
                  </div>
                </div>
                {/* Contact 2 */}
                <div className="p-4 border-b border-gray-200 hover:bg-blue-50 cursor-pointer bg-blue-50">
                  <div className="flex items-center">
                    <img
                      className="h-10 w-10 rounded-full"
                      src="https://images.unsplash.com/photo-1552058544-f2b08422138a?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                      alt=""
                    />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        Michael Chen
                      </p>
                      <p className="text-sm text-gray-500">BIT • Mathematics</p>
                    </div>
                    <div className="ml-auto text-xs text-gray-500">Now</div>
                  </div>
                </div>
                {/* Contact 3 */}
                <div className="p-4 border-b border-gray-200 hover:bg-blue-50 cursor-pointer">
                  <div className="flex items-center">
                    <img
                      className="h-10 w-10 rounded-full"
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                      alt=""
                    />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        Amanda Williams
                      </p>
                      <p className="text-sm text-gray-500">
                        Diploma • Networking
                      </p>
                    </div>
                    <div className="ml-auto text-xs text-gray-500">1d ago</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Area */}
            <div
              className="w-full md:w-2/3 flex flex-col"
              style={{ height: "500px" }}
            >
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center">
                  <img
                    className="h-10 w-10 rounded-full"
                    src="https://images.unsplash.com/photo-1552058544-f2b08422138a?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                    alt=""
                  />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      Michael Chen
                    </p>
                    <p className="text-sm text-gray-500">Online</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                {/* Message from tutor */}
                <div className="flex mb-4">
                  <img
                    className="h-8 w-8 rounded-full"
                    src="https://images.unsplash.com/photo-1552058544-f2b08422138a?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                    alt=""
                  />
                  <div className="ml-3">
                    <div className="bg-white chat-bubble py-2 px-4 shadow-md rounded-lg">
                      <p className="text-sm text-gray-800">
                        Hi there! How can I help you with calculus today?
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 block mt-1">
                      2:45 PM
                    </span>
                  </div>
                </div>
                {/* Message from user */}
                <div className="flex mb-4 justify-end">
                  <div className="mr-3">
                    <div className="bg-bc-blue chat-bubble own py-2 px-4 shadow-md rounded-lg">
                      <p className="text-sm text-white">
                        I'm struggling with integration by parts. I don't
                        understand when to use which function as u and which as
                        dv.
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 block mt-1 text-right">
                      2:47 PM
                    </span>
                  </div>
                  <img
                    className="h-8 w-8 rounded-full"
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                    alt=""
                  />
                </div>
                {/* Message from tutor */}
                <div className="flex mb-4">
                  <img
                    className="h-8 w-8 rounded-full"
                    src="https://images.unsplash.com/photo-1552058544-f2b08422138a?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                    alt=""
                  />
                  <div className="ml-3">
                    <div className="bg-white chat-bubble py-2 px-4 shadow-md rounded-lg">
                      <p className="text-sm text-gray-800">
                        No problem! There's a handy rule called LIATE that helps
                        decide which function to choose as u. It stands for
                        Logarithmic, Inverse trigonometric, Algebraic,
                        Trigonometric, Exponential.
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 block mt-1">
                      2:49 PM
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex items-center">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    className="flex-1 border border-gray-300 rounded-l-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-bc-blue focus:border-bc-blue"
                  />
                  <button className="bg-bc-blue text-white py-2 px-4 rounded-r-md hover:bg-bc-blue-light focus:outline-none focus:ring-2 focus:ring-bc-blue">
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
