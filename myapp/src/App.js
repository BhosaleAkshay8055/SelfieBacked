import "./assets/styles.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SentFormData from "./components/Form";
import PageNotFound from "./components/PageNotFound/PageNotFound";
function App() {
  return (
    <>
      <Router>
        {/* <Header /> */}
        <Routes>
          <Route exact path="/" element={<SentFormData />} />
          {/* Catch-all route for 404 page */}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
