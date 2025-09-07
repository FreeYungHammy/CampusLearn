import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

const Layout = () => {
  return (
    <>
      <div className="app-shell">
        <Header />
        <main className="content">
          <Outlet />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Layout;
