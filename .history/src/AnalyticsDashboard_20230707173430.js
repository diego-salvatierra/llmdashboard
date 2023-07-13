import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useTable } from "react-table";
import { BarChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const SUPABASE_URL = "https://oztnyyvptigozambngap.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dG55eXZwdGlnb3phbWJuZ2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzA4MTI1NzYsImV4cCI6MTk4NjM4ODU3Nn0.TDS4CQbqY-ntkVxEvacw1MJrDZ_DdE0l8puXQCE1bRc";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AnalyticsDashboard = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchApiData();
  }, []);

  async function fetchApiData() {
    let { data: fetchedData, error, count } = await supabase
      .from("aiUsage")
      .select("type, model, cost, created_at")
      .order('created_at', { ascending: false })
      .range(0, 999);
    
    if (error) {
      console.error("Error fetching API data:", error);
      return;
    }
  
    console.log('Initial fetch count:', fetchedData.length); // Log the initial fetch count
  
    // Fetch the rest of the data if there's more than 1,000 rows
    while (fetchedData.length < count) {
      const { data: additionalData, error } = await supabase
        .from("aiUsage")
        .select("type, model, cost, created_at")
        .order('created_at', { ascending: false })
        .range(fetchedData.length, fetchedData.length + 999);
  
      if (error) {
        console.error("Error fetching additional API data:", error);
        break;
      }
  
      fetchedData = [...fetchedData, ...additionalData];
      console.log('Additional fetch count:', additionalData.length); // Log the count for each additional fetch
    }
  
    console.log('Final fetch count:', fetchedData.length); // Log the final total fetch count
    setData(fetchedData);
  }
  
  

  function calculateTotals() {
    let totals = {
      calls: {},
      costs: {}
    };

    data.forEach((entry) => {
      const { type, model, cost } = entry;
      const key = `${type}-${model}`;

      if (totals.calls[key]) {
        totals.calls[key]++;
      } else {
        totals.calls[key] = 1;
      }

      if (totals.costs[key]) {
        totals.costs[key] += cost;
      } else {
        totals.costs[key] = cost;
      }
    });

    return totals;
  }

  const totals = calculateTotals();

  const columns = React.useMemo(
    () => [
      {
        Header: "Type",
        accessor: "type"
      },
      {
        Header: "Model",
        accessor: "model"
      },
      {
        Header: "Calls",
        accessor: "calls"
      },
      {
        Header: "Cost",
        accessor: "cost"
      }
    ],
    []
  );

  const tableData = Object.entries(totals.calls).map(([key, count]) => {
    const [type, model] = key.split("-");
    const cost = totals.costs[key];

    return {
      type,
      model,
      calls: count,
      cost: cost.toFixed(6)
    };
  });

  const totalCost = Object.values(totals.costs).reduce((a, b) => a + b, 0);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow
  } = useTable({ columns, data: tableData });

  function generateChartData() {
    return Object.entries(totals.calls).map(([key, count]) => {
      const [type, model] = key.split("-");
      const cost = totals.costs[key];

      return {
        type,
        model,
        calls: count,
        cost: cost.toFixed(6)
      };
    });
  }

  function generateLineChartData() {
    let lineData = {};
    const relevantTypes = ["gptChat", "fixer", "sayWhisper"];
    
    data.forEach((entry) => {
      if (!relevantTypes.includes(entry.type)) return;

      const { type, model, created_at } = entry; // Use created_at instead of date
      const key = `${type}-${model}`;

      // Format the date to just YYYY-MM-DD format
      const date = new Date(created_at).toISOString().split('T')[0];

      if (!lineData[date]) {
        lineData[date] = {};
      }

      if (lineData[date][key]) {
        lineData[date][key]++;
      } else {
        lineData[date][key] = 1;
      }
    });

    return Object.entries(lineData).map(([date, types]) => {
      let newObj = { date };

      for (let key in types) {
        newObj[key] = types[key];
      }

      return newObj;
    });
}

  const chartData = generateChartData();
  const lineChartData = generateLineChartData();

  return (
    <>
      <h1>OpenAI API Call Analytics</h1>
      <p>Total cost: ${totalCost.toFixed(6)}</p>

      <h2>Total Calls per Type and Model</h2>
      <BarChart
        width={2000} // updated width
        height={300}
        data={chartData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="type" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="calls" name="Calls" fill="#8884d8" />
      </BarChart>

      <h2>Cost per Type and Model</h2>
      <BarChart
        width={2000} // updated width
        height={300}
        data={chartData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="type" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="cost" name="Cost" fill="#82ca9d" />
      </BarChart>

      <h2>Number of Calls Over Time (Selected Types)</h2>
      <LineChart
        width={1500} // updated width
        height={300}
        data={lineChartData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        {lineChartData[0] && Object.keys(lineChartData[0]).map((key, i) => 
          key !== 'date' && <Line type="monotone" dataKey={key} stroke={getRandomColor()} key={i} />
        )}
      </LineChart>

      <h2>API Calls</h2>
      <table {...getTableProps()} style={{margin: "auto"}}>
        <thead>
          {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                <th {...column.getHeaderProps()}>{column.render('Header')}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map(row => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map(cell => (
                  <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
};

export default AnalyticsDashboard;

function getRandomColor() {
  let letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
