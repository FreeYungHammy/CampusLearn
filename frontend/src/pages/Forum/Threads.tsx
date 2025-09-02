import { Link } from "react-router-dom";

const threads = [
  {
    id: 1,
    category: "Programming",
    title: "JavaScript Closure Concepts",
    summary:
      "Can someone explain closures in JavaScript with a practical example? I'm struggling to understand how they work...",
    author: "Anonymous",
    date: "Mar 16, 2023",
    replies: 25,
    icon: "fas fa-code",
  },
  {
    id: 2,
    category: "Mathematics",
    title: "Calculus Integration Problems",
    summary:
      "I'm having trouble solving integration by parts for this specific equation. Any tips or resources that might help?",
    author: "Anonymous",
    date: "Mar 10, 2023",
    replies: 18,
    icon: "fas fa-calculator",
  },
  {
    id: 3,
    category: "Database",
    title: "SQL Query Optimization",
    summary:
      "How can I optimize this complex SQL query to run faster? I've tried indexing but still experiencing performance issues...",
    author: "Anonymous",
    date: "Mar 5, 2023",
    replies: 32,
    icon: "fas fa-database",
  },
];

const Threads = () => {
  return (
    <div className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center">
          <h2 className="text-base font-semibold text-bc-blue tracking-wide uppercase">
            Forum
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Public Academic Discussions
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
            Ask questions anonymously and get answers from the entire student
            community.
          </p>
        </div>

        <div className="mt-12 grid gap-5 max-w-lg mx-auto lg:grid-cols-3 lg:max-w-none">
          {threads.map((thread) => (
            <div
              key={thread.id}
              className="flex flex-col rounded-lg shadow-lg overflow-hidden forum-card transition duration-300"
            >
              <div className="flex-shrink-0">
                <div className="h-48 bg-gradient-to-r from-bc-blue to-bc-blue-light flex items-center justify-center">
                  <span className="text-white text-6xl">
                    <i className={thread.icon}></i>
                  </span>
                </div>
              </div>
              <div className="flex-1 bg-white p-6 flex flex-col justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-bc-blue">
                      {thread.category}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      {thread.replies} replies
                    </span>
                  </div>
                  <Link to={`/forum/${thread.id}`} className="block mt-2">
                    <p className="text-xl font-semibold text-gray-900">
                      {thread.title}
                    </p>
                    <p className="mt-3 text-base text-gray-500">
                      {thread.summary}
                    </p>
                  </Link>
                </div>
                <div className="mt-6 flex items-center">
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gray-300">
                      <span className="text-sm font-medium leading-none text-gray-900">
                        A
                      </span>
                    </span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {thread.author}
                    </p>
                    <div className="flex space-x-1 text-sm text-gray-500">
                      <time dateTime={thread.date}>{thread.date}</time>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-bc-blue hover:bg-bc-blue-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bc-blue">
            View All Discussions
            <i className="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Threads;
