import { useEffect, useState } from "react";
import { fetchDailyQuizzes } from "../../utils/quizService"; // Your fetch function

const Dashboard = () => {
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    const loadQuizzes = async () => {
      const data = await fetchDailyQuizzes();
      setQuizzes(data);
    };
    loadQuizzes();
  }, []);

  return (
    <div>
      <h1>Daily Quizzes</h1>
      <ul>
        {quizzes.map((quiz, index) => (
          <li key={index}>{quiz}</li>
        ))}
      </ul>
    </div>
  );
};

export default Dashboard;
