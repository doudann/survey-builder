import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Chart.js n'inclut que les éléments qu'on enregistre (fichier plus léger)
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

// Types à une seule réponse : on montre des parts d'un tout (anneau)
const DOUGHNUT_TYPES = ['multiple-choice', 'dropdown', 'yes-no'];

export default function QuestionChart({ type, counts }) {
  const labels = counts.map((item) => item.label);
  const values = counts.map((item) => item.count);

  if (DOUGHNUT_TYPES.includes(type)) {
    const data = {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: values.map((_, i) => COLORS[i % COLORS.length]),
        },
      ],
    };

    return (
      <div className="chart-box">
        <Doughnut
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
          }}
        />
      </div>
    );
  }

  // Cases à cocher et notes : on compare des quantités (barres)
  const data = {
    labels,
    datasets: [{ label: 'Réponses', data: values, backgroundColor: COLORS[0] }],
  };

  return (
    <div className="chart-box">
      <Bar
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        }}
      />
    </div>
  );
}
