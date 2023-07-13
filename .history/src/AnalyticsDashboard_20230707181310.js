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
    const { data: apiData, error } = await supabase
      .from("aiUsage")
      .select("type, model, cost, created_at, user")
      .order('created_at', { ascending: true }); // Sort in ascending order to get the latest entries on the right
  
    if (error) console.error("Error fetching API data:", error);
  
    // Filter out entries where 'type' contains 'BACKEND'
    const filteredData = apiData.filter(entry => !entry.type.includes('BACKEND'));
  
    setData(filteredData);
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

  const relevantTypes = ["gptChat", "fixer", "sayWhisper", "explainer"];

function generateLineChartData() {
  let lineData = {};

  // get current date and time
  const now = new Date();

  // subtract 3 days from the current date and time
  const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));

  data.forEach((entry) => {
    if (!relevantTypes.includes(entry.type)) return;

    const { type, created_at } = entry;

    const createdDate = new Date(created_at);
    // exclude entries older than 3 days
    if (createdDate < threeDaysAgo) return;

    // format the date to just be YYYY-MM-DD
    const date = createdDate.toISOString().split('T')[0];

    if (!lineData[date]) {
      lineData[date] = {};
    }

    if (lineData[date][type]) {
      lineData[date][type]++;
    } else {
      lineData[date][type] = 1;
    }
  });

  // Sort the entries by date
  const sortedEntries = Object.entries(lineData).sort((a, b) => new Date(a[0]) - new Date(b[0]));

  return sortedEntries.map(([date, types]) => {
    let newObj = { date };

    for (let key in types) {
      newObj[key] = types[key];
    }

    return newObj;
  });
}

  
  
  

function generateUserChartData(targetType) {
  let userData = {};
  // Get current date and time
  const now = new Date();
  // Subtract 3 days from the current date and time
  const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));

  data.forEach((entry) => {
    const { type, user, created_at } = entry;

    const createdDate = new Date(created_at);
    // Exclude entries older than 3 days and types that are not the target
    if (createdDate < threeDaysAgo || type !== targetType) return;

    if (!userData[user]) {
      userData[user] = 1;
    } else {
      userData[user]++;
    }
  });

  // Convert our data from the {user: count} format to {user, calls} format
  // Also sort it in descending order of calls and only take the top 5
  return Object.entries(userData)
    .map(([user, calls]) => ({ user, calls }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 30);
}

// Then generate your data for each type:

const gptChatUserData = generateUserChartData('gptChat');
const fixerUserData = generateUserChartData('fixer');
const sayWhisperUserData = generateUserChartData('sayWhisper');


const activeUsersData = generateActiveUsersData();

function generateActiveUsersData() {
  let activeUsersData = {};

  // get current date and time
  const now = new Date();

  // subtract 3 days from the current date and time
  const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));

  data.forEach((entry) => {
    const { user, created_at } = entry;

    const createdDate = new Date(created_at);
    // exclude entries older than 3 days
    if (createdDate < threeDaysAgo) return;

    // format the date to just be YYYY-MM-DD
    const date = createdDate.toISOString().split('T')[0];

    if (!activeUsersData[date]) {
      activeUsersData[date] = new Set(); // use a Set to store unique user values
    }

    activeUsersData[date].add(user); // add the user to the Set
  });

  // convert our data from the {date: Set} format to {date, count} format
  return Object.entries(activeUsersData).map(([date, users]) => {
    return {
      date,
      count: users.size, // the size property of a Set gives the number of unique elements
    };
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
<BarChart
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
  {relevantTypes.map((type, i) => 
    <Bar dataKey={type} name={type} fill={getRandomColor()} key={i} />
  )}
</BarChart>
<h2>Active Users Per Day</h2>
<BarChart
  width={1500}
  height={300}
  data={activeUsersData}
  margin={{
    top: 20,
    right: 30,
    left: 20,
    bottom: 5,
  }}
>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="count" name="Active Users" fill={getRandomColor()} />
</BarChart>

      <h2>Buddy messages per user</h2>
<BarChart
  width={500}
  height={300}
  data={gptChatUserData}
  margin={{
    top: 20,
    right: 30,
    left: 20,
    bottom: 5
  }}
>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="user" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="calls" fill="#8884d8" />
</BarChart>

<h2>Users by fixer</h2>
<BarChart
  width={500}
  height={300}
  data={fixerUserData}
  margin={{
    top: 20,
    right: 30,
    left: 20,
    bottom: 5
  }}
>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="user" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="calls" fill="#8884d8" />
</BarChart>



<h2>Users by sayWhisper</h2>
<BarChart
  width={500}
  height={300}
  data={sayWhisperUserData}
  margin={{
    top: 20,
    right: 30,
    left: 20,
    bottom: 5
  }}
>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="user" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="calls" fill="#8884d8" />
</BarChart>

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
