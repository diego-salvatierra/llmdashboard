import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useTable } from "react-table";
import { BarChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import HeatMap from 'react-heatmap-grid';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);


const AnalyticsDashboard = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchApiData();
  }, []);

  async function fetchApiData() {
    const { data: apiData, error } = await supabase
        .from("aiUsage")
        .select("type, model, cost, created_at, user")
        .gte('created_at', '2023-07-05') // only consider entries after July 5th
        .order('created_at', { ascending: true });

    if (error) console.error("Error fetching API data:", error);

    // Filter out entries where 'type' contains 'BACKEND'
    let filteredData = apiData.filter(entry => !entry.type.includes('BACKEND'));

    // List of test userIDs
    const testUserIds = [
        '78673c9a-6e61-4d23-892e-be594868a83b',
        'e89436e3-8a54-4eee-bb06-050079400705',
        '681167b9-6537-487a-a340-2d77245c080d',
        '76eae254-4658-4cb0-bb6f-2c4e90905f46',
        'f2163b04-188a-4c7d-bb11-f939d0d214e9',
        '6b0a5dab-4571-4869-ac40-139d63b93d4e',
        'bf1533e9-47a8-44fb-a190-706141ee5de7', // Tom
        'fe8a5e25-b690-4e59-988d-a44d286f5b4e', // Xander
        '8b883821-0441-445d-8860-6e680bdf0100', // Jose
    ];

    // Further filter out test users
    filteredData = filteredData.filter(entry => !testUserIds.includes(entry.user));

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

  const weekAgo = new Date(now.getTime() - (23 * 24 * 60 * 60 * 1000));


  data.forEach((entry) => {
    if (!relevantTypes.includes(entry.type)) return;

    const { type, created_at } = entry;

    const createdDate = new Date(created_at);
    // exclude entries older than 5 days
    if (createdDate < weekAgo) return;

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
  const weekAgo = new Date(now.getTime() - (19 * 24 * 60 * 60 * 1000));

  data.forEach((entry) => {
    const { type, user, created_at } = entry;

    const createdDate = new Date(created_at);
    // Exclude entries older than 3 days and types that are not the target
    if (createdDate < weekAgo || type !== targetType) return;

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
    .slice(0, 10);
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

  // subtract 7 days from the current date and time
  const weekAgo = new Date(now.getTime() - (19 * 24 * 60 * 60 * 1000));


  data.forEach((entry) => {
    const { user, created_at } = entry;

    const createdDate = new Date(created_at);
    // exclude entries older than 3 days
    if (createdDate < weekAgo) return;

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

function generateUsersData() {
  let usersData = {};

  // set the end date to the end of the current day
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  // set the start date to the start of July 5, 2023
  const startDate = new Date('2023-07-05T00:00:00Z');
  startDate.setHours(0, 0, 0, 0);

  data.forEach((entry) => {
    const { user, created_at } = entry;

    const createdDate = new Date(created_at);

    // Exclude entries older than start date and newer than end date
    if (createdDate < startDate || createdDate > endDate) return;

    // Transform date to only consider the date part without the time
    const date = createdDate.toISOString().split('T')[0];
    if (!usersData[user]) {
      usersData[user] = new Set([date]);
    } else {
      usersData[user].add(date);
    }

    // Add console log for specific user
    if (user === 'a0b6ab7c-c831-4382-9585-8b57484dbf97') {
      console.log(`User ${user} activity on ${date}`);
    }
  });

  let activityData = {
    '1': 0,
    '2': 0,
    '3': 0,
    '4+': 0,
  };

  Object.values(usersData).forEach((dates) => {
    const activeDays = dates.size;
    if (activeDays >= 1 && activeDays <= 3) {
      activityData[activeDays.toString()]++;
    } else if (activeDays >= 4) {
      activityData['4+']++;
    }
  });


  // Transform data to format suitable for charting
  const chartData = Object.entries(activityData).map(([days, count]) => {
    return { name: `${days} Day(s)`, count };
  });

  return chartData;
}



   const chartData = generateChartData();
  const lineChartData = generateLineChartData();

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">User ID : {label}</p>
          <p className="intro">Number of calls : {payload[0].value}</p>
        </div>
      );
    }
  
    return null;
  };

  function generateSpecificUserChartData(userId) {
    let userData = {};
  
    // set the start date to July 6, 2023
    const startDate = new Date('2023-07-06T00:00:00');
  
    data.forEach((entry) => {
      const { type, user, created_at } = entry;
  
      const createdDate = new Date(created_at);
      // Exclude entries older than the start date, types that are not 'fixer', and users that are not the specified user
      if (createdDate < startDate || type !== 'fixer' || user !== userId) return;
  
      // format the date and hour to be YYYY-MM-DDTHH
      const date = `${createdDate.toISOString().split(':')[0]}:00`;
  
      if (!userData[date]) {
        userData[date] = 1;
      } else {
        userData[date]++;
      }
    });
  
    // Convert our data from the {date: count} format to {date, calls} format
    return Object.entries(userData)
      .map(([date, calls]) => ({ date, calls }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }
    
  
  const specificUserFixerData = generateSpecificUserChartData('a0b6ab7c-c831-4382-9585-8b57484dbf97');  

  // retention chart 

  // Assuming the data is ordered by 'created_at'
function generateCohorts(eventType) {
  let cohorts = {};

  data.forEach((entry) => {
    // If an eventType is given and the entry's type doesn't match, skip this entry
    if (eventType && entry.type !== eventType) {
      return;
    }

    const { user, created_at } = entry;
    const date = new Date(created_at).toISOString().split('T')[0];

    // If the user doesn't have a cohort yet, create one
    if (!cohorts[user]) {
      cohorts[user] = { startDate: date, activityDates: new Set([date]) };
    } else {
      // If the user is already part of a cohort, add the new date to the set
      cohorts[user].activityDates.add(date);
    }
  });

  // Now we have our cohorts. Next, we build our retention table

  let retentionTable = {};
  Object.values(cohorts).forEach(({ startDate, activityDates }) => {
    if (!retentionTable[startDate]) {
      retentionTable[startDate] = { cohortSize: 1, activityByDay: {}, totalUsers: 1 }; // Added 'totalUsers'
    } else {
      retentionTable[startDate].cohortSize++;
      retentionTable[startDate].totalUsers++; // Increment 'totalUsers'
    }

    // Register the activity of the user for each day
    activityDates.forEach((date) => {
      // Calculate the difference in days between the start date and the current date
      const diffInDays =
        (new Date(date) - new Date(startDate)) / (1000 * 60 * 60 * 24);

      if (!retentionTable[startDate].activityByDay[diffInDays]) {
        retentionTable[startDate].activityByDay[diffInDays] = 1;
      } else {
        retentionTable[startDate].activityByDay[diffInDays]++;
      }
    });
  });

  // Finally, we calculate the retention for each cohort for each day
  for (const [startDate, { cohortSize, activityByDay }] of Object.entries(
    retentionTable
  )) {
    for (const [day, activity] of Object.entries(activityByDay)) {
      // The retention rate is the activity of the cohort on that day divided by the size of the cohort
      retentionTable[startDate].activityByDay[day] = activity / cohortSize;
    }
  }

  return retentionTable;
}

const fixerCohort = generateCohorts('fixer');
const gptChatCohort = generateCohorts('gptChat');
const sayWhisperCohort = generateCohorts('sayWhisper');
const allUsersCohort = generateCohorts();



function CustomHeatMap({ data, xLabels, yLabels, userCounts }) {
  return (
    <table>
      <thead>
        <tr>
          <th></th>
          <th>User Count</th>
          {xLabels.map((xLabel, i) => (
            <th key={i} style={{fontSize: '12px'}}>{xLabel}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            <td style={{fontSize: '12px'}}>{yLabels[i]}</td>
            <td style={{fontSize: '12px'}}>{userCounts[i]}</td>
            {row.map((value, j) => (
              <td key={j} style={{
                backgroundColor: `rgba(66, 86, 244, ${1 - (1 - value) / 1})`, 
                fontSize: '12px'
              }}>
                {value && `${(value * 100).toFixed(0)}%`}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CohortHeatMap({ cohortData }) {
  const startDateList = Object.keys(cohortData);
  
  // Ensure the dates are sorted
  startDateList.sort();
  
  // Get the maximum day count in all cohorts
  const maxDayCount = Math.max(...startDateList.map(startDate => 
    Math.max(...Object.keys(cohortData[startDate].activityByDay))
  ));
  
  const xLabels = Array.from({ length: maxDayCount + 1 }, (_, i) => i);
  const yLabels = startDateList;
  const userCounts = startDateList.map(startDate => cohortData[startDate].totalUsers);
  const data = startDateList.map(startDate => 
    Array.from({ length: maxDayCount + 1 }, (_, i) => cohortData[startDate].activityByDay[i] || 0)
  );

  return (
    <CustomHeatMap
      xLabels={xLabels}
      yLabels={yLabels}
      data={data}
      userCounts={userCounts}
    />
  );
}



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

<h2>User Activity</h2>
<BarChart
  width={1500}
  height={300}
  data={generateUsersData()}
  margin={{
    top: 20,
    right: 30,
    left: 20,
    bottom: 5
  }}
>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="count" fill="#8884d8" />
</BarChart>



      <h2>Buddy messages per user</h2>
<BarChart
  width={2000}
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
  <Tooltip content={<CustomTooltip />} />
  <Legend />
  <Bar dataKey="calls" fill="#8884d8" />
</BarChart>

<h2>Users by fixer</h2>
<BarChart
  width={2000}
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
  <Tooltip content={<CustomTooltip />} />
  <Legend />
  <Bar dataKey="calls" fill="#8884d8" />
</BarChart>



<h2>Users by sayWhisper</h2>
<BarChart
  width={2000}
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
  <Tooltip content={<CustomTooltip />} />
  <Legend />
  <Bar dataKey="calls" fill="#8884d8" />
</BarChart>

<h2>Builder usage by specific user over time</h2>
<BarChart
  width={2000}
  height={300}
  data={specificUserFixerData}
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
  <Bar dataKey="calls" fill="#8884d8" />
</BarChart>

<div>

<h1>Overall Retention Cohort</h1>
  <CohortHeatMap cohortData={allUsersCohort} />
  
  <h1>Fixer Retention Cohort</h1>
  <CohortHeatMap cohortData={fixerCohort} />
  
  <h1>GptChat Retention Cohort</h1>
  <CohortHeatMap cohortData={gptChatCohort} />

  <h1>SayWhisper Retention Cohort</h1>
  <CohortHeatMap cohortData={sayWhisperCohort} />

  

</div>


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
