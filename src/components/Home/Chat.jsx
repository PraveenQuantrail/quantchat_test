import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSend,
  FiDatabase,
  FiMessageSquare,
  FiCopy,
  FiCheck,
  FiUser,
  FiEdit3,
  FiRefreshCw,
  FiBarChart2,
  FiPieChart,
} from "react-icons/fi";
import { FaCircle } from "react-icons/fa";
import { databaseApi, authApi, ChatWithSQL_API } from "../../utils/api";
import ViewSelectedDBInfo from "./ViewSelectedDBInfo";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Brain, Sparkles, BarChart3, PieChart as PieChartIcon } from 'lucide-react';

const statusColors = {
  Connected: "text-green-500",
  Disconnected: "text-red-500",
};

// Animation variants
const statusVariants = {
  hidden: { opacity: 0, x: -10, scale: 0.95 },
  visible: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -10, scale: 0.95 }
};

const containerVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
};

// Predefined responses for demo
const PREDEFINED_RESPONSES = {
  "c": {
    text: "I'll help you find the top 10 customers by revenue for this year.",
    sql: "SELECT customer_name, SUM(order_total) as revenue\nFROM orders o\nJOIN customers c ON o.customer_id = c.id\nWHERE YEAR(order_date) = 2025\nGROUP BY customer_id, customer_name\nORDER BY revenue DESC\nLIMIT 10;",
    results: {
      headers: ["Customer Name", "Revenue"],
      rows: [
        ["Acme Corp", "$125,450"],
        ["Globex", "$98,760"],
        ["Wayne Enterprises", "$87,340"],
        ["Stark Industries", "$76,540"],
        ["Umbrella Corp", "$65,430"],
        ["Oscorp", "$54,320"],
        ["Wonka Industries", "$43,210"],
        ["Cyberdyne Systems", "$32,100"],
        ["Tyrell Corp", "$28,970"],
        ["Spacely Sprockets", "$24,860"],
      ],
    },
    chartData: [
      { name: 'Acme Corp', revenue: 125450 },
      { name: 'Globex', revenue: 98760 },
      { name: 'Wayne Ent.', revenue: 87340 },
      { name: 'Stark Ind.', revenue: 76540 },
      { name: 'Umbrella Corp', revenue: 65430 },
      { name: 'Oscorp', revenue: 54320 },
      { name: 'Wonka Ind.', revenue: 43210 },
      { name: 'Cyberdyne', revenue: 32100 },
      { name: 'Tyrell Corp', revenue: 28970 },
      { name: 'Spacely', revenue: 24860 },
    ]
  },
  "can you show me monthly sales trends": {
    text: "Here are the monthly sales trends for the current year:",
    sql: "SELECT \n  YEAR(order_date) as year,\n  MONTH(order_date) as month,\n  SUM(order_total) as monthly_revenue\nFROM orders\nGROUP BY YEAR(order_date), MONTH(order_date)\nORDER BY year, month;",
    results: {
      headers: ["Month", "Revenue"],
      rows: [
        ["January", "$89,240"],
        ["February", "$92,150"],
        ["March", "$105,430"],
        ["April", "$88,760"],
        ["May", "$95,420"],
        ["June", "$102,350"],
        ["July", "$97,860"],
        ["August", "$104,540"],
        ["September", "$99,870"],
        ["October", "$112,430"],
        ["November", "$108,760"],
        ["December", "$125,890"],
      ],
    },
    chartData: [
      { name: 'Jan', revenue: 89240 },
      { name: 'Feb', revenue: 92150 },
      { name: 'Mar', revenue: 105430 },
      { name: 'Apr', revenue: 88760 },
      { name: 'May', revenue: 95420 },
      { name: 'Jun', revenue: 102350 },
      { name: 'Jul', revenue: 97860 },
      { name: 'Aug', revenue: 104540 },
      { name: 'Sep', revenue: 99870 },
      { name: 'Oct', revenue: 112430 },
      { name: 'Nov', revenue: 108760 },
      { name: 'Dec', revenue: 125890 },
    ]
  },
  "what are the product categories by sales": {
    text: "Here's the breakdown of sales by product category:",
    sql: "SELECT category_name, SUM(sales_amount) as total_sales\nFROM products p\nJOIN sales s ON p.product_id = s.product_id\nGROUP BY category_name\nORDER BY total_sales DESC;",
    results: {
      headers: ["Category", "Sales"],
      rows: [
        ["Electronics", "$245,670"],
        ["Clothing", "$189,340"],
        ["Home & Garden", "$156,780"],
        ["Sports", "$98,450"],
        ["Books", "$67,890"],
      ],
    },
    chartData: [
      { name: 'Electronics', value: 245670 },
      { name: 'Clothing', value: 189340 },
      { name: 'Home & Garden', value: 156780 },
      { name: 'Sports', value: 98450 },
      { name: 'Books', value: 67890 },
    ]
  }
};

const COLORS = ['#5D3FD3', '#6d4fe4', '#7d5ff5', '#8d6ff6', '#9d7ff7'];

function getToken() {
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

function getSelectedDbStorageKey() {
  let token = getToken();
  return token ? `selectedDb_${token}` : "selectedDb";
}

function getSessionID() {
  const sessionsdata = JSON.parse(localStorage.getItem(process.env.REACT_APP_SESSIONID_KEY)) || []
  return sessionsdata;
}

// Loading animation component
const LoadingDots = () => (
  <div className="flex space-x-1">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="w-2 h-2 bg-[#5D3FD3] rounded-full"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          delay: i * 0.2,
        }}
      />
    ))}
  </div>
);

// Thinking animation component
const ThinkingAnimation = () => (
  <div className="flex items-center space-x-2 bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
    >
      <Brain className="text-blue-500" size={20} />
    </motion.div>
    <div className="flex-1">
      <div className="text-sm text-blue-700 font-medium">QuantChat is thinking</div>
      <div className="text-xs text-blue-600">Analyzing your query and generating insights...</div>
    </div>
    <LoadingDots />
  </div>
);

export default function Chat() {
  const [selectedDb, setSelectedDb] = useState("");
  const [dbStatus, setDbStatus] = useState("");
  const [message, setMessage] = useState("");
  const [copiedItems, setCopiedItems] = useState({});
  const [editingIndex, setEditingIndex] = useState(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [chats, setChats] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [checkingDbStatus, setCheckingDbStatus] = useState(false);
  const [expandedSummaries, setExpandedSummaries] = useState({});
  const [showDBInfo, setShowDBInfo] = useState(false);
  const [selectedDbDetails, setSelectedDbDetails] = useState(null);
  const [schemaData, setSchemaData] = useState(null);
  const [showStatus, setShowStatus] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState({});
  const [generatingVisualization, setGeneratingVisualization] = useState({});
  const [activeVisualizations, setActiveVisualizations] = useState({});
  const [hasShownWelcomeMessage, setHasShownWelcomeMessage] = useState(false);


  // session id details

  // store the all sessions data here
  const [sessionID, setSessionID] = useState([]);

  // store the current database sessionid 
  const [currentSelectedID, setCurrentSelectedID] = useState("");





  const getSessionIDWithDBID = (id) => {
    if (id && sessionID.length) {
      const findValue = sessionID.filter(val => val.dbid === Number(id));
      if (findValue.length > 0) {
        setCurrentSelectedID(findValue[0].token);
      }
    }
  }





  // On mount, restore selectedDb from localStorage/sessionStorage for this user
  useEffect(() => {
    const dbKey = getSelectedDbStorageKey();
    const storedDb = sessionStorage.getItem(dbKey) || localStorage.getItem(dbKey) || "";
    if (storedDb) {
      setSelectedDb(storedDb);

    }
  }, []);

  // Show welcome message when database is selected
  useEffect(() => {
    if (selectedDb && !hasShownWelcomeMessage) {
      setChats([
        {
          type: "bot",
          text: "Welcome to QuantChat! I can help you query your database using natural language. Just describe what data you're looking for.",
        },
      ]);
      setHasShownWelcomeMessage(true);
    } else if (!selectedDb && hasShownWelcomeMessage) {
      // Clear chats when database is deselected
      setChats([]);
      setHasShownWelcomeMessage(false);
    }
  }, [selectedDb, hasShownWelcomeMessage]);

  const checkDbStatus = useCallback(async () => {
    if (!selectedDb || !initialLoadComplete) {
      setDbStatus("");
      setShowStatus(false);
      return;
    }

    setCheckingDbStatus(true);
    try {
      const dbDetails = await databaseApi.getDetails(selectedDb);
      getSessionIDWithDBID(dbDetails.id);
      let status = dbDetails.status;
      if (status === "Connected (Warning)") status = "Connected";
      if (
        status === "Testing..." ||
        status === "Connecting..." ||
        status === "Disconnecting..."
      ) {
        status = "Disconnected";
      }
      if (status !== "Connected" && status !== "Disconnected") {
        status = dbDetails.status === "Connected" ? "Connected" : "Disconnected";
      }
      setDbStatus(status);
      setSelectedDbDetails(dbDetails);
      setShowStatus(true);
    } catch (err) {
      setDbStatus("Disconnected");
      setSelectedDbDetails(null);
      setShowStatus(true);
    } finally {
      setCheckingDbStatus(false);
    }
  }, [selectedDb, initialLoadComplete]);

  useEffect(() => {
    let isMounted = true;
    async function fetchAll() {
      setDbLoading(true);
      try {
        const dbListResp = await databaseApi.getAll({ page: 1, limit: 100 });
        const dbList = Array.isArray(dbListResp.databases)
          ? dbListResp.databases.map((db) => ({
            id: db.id?.toString() ?? "",
            name: db.name ?? "(no name)",
          }))
          : [];
        if (isMounted) setDatabases(dbList);

        let token = getToken();
        if (token) {
          try {
            let selectedDbResp = await authApi.getSelectedDatabase();
            let serverSelectedDb = selectedDbResp.success
              ? selectedDbResp.selectedDatabase?.toString()
              : "";
            if (
              serverSelectedDb &&
              dbList.some((db) => db.id === serverSelectedDb)
            ) {
              setSelectedDb(serverSelectedDb);
              const dbKey = getSelectedDbStorageKey();
              sessionStorage.setItem(dbKey, serverSelectedDb);
              localStorage.setItem(dbKey, serverSelectedDb);
            } else {
              setSelectedDb("");
              const dbKey = getSelectedDbStorageKey();
              sessionStorage.removeItem(dbKey);
              localStorage.removeItem(dbKey);
              if (serverSelectedDb) await authApi.setSelectedDatabase("");
            }
          } catch (err) {
            setSelectedDb("");
            const dbKey = getSelectedDbStorageKey();
            sessionStorage.removeItem(dbKey);
            localStorage.removeItem(dbKey);
          }
        }
      } catch (error) {
        setDatabases([]);
        setSelectedDb("");
        const dbKey = getSelectedDbStorageKey();
        sessionStorage.removeItem(dbKey);
        localStorage.removeItem(dbKey);
      } finally {
        if (isMounted) {
          setDbLoading(false);
          setSessionID(getSessionID());
          setInitialLoadComplete(true);
        }
      }
    }
    fetchAll();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!initialLoadComplete) return;
    const dbKey = getSelectedDbStorageKey();
    if (selectedDb) {
      sessionStorage.setItem(dbKey, selectedDb);
      localStorage.setItem(dbKey, selectedDb);
    } else {
      sessionStorage.removeItem(dbKey);
      localStorage.removeItem(dbKey);
    }
    let token = getToken();
    if (token) {
      const dbRES = authApi.setSelectedDatabase(selectedDb)
      // select sessionid 
      // const responseData =  dbRES
      // console.log(responseData)
    }
  }, [selectedDb, initialLoadComplete]);

  useEffect(() => {
    checkDbStatus();
  }, [checkDbStatus]);

  const fetchSchemaData = async () => {
    if (!selectedDb || dbStatus !== "Connected") return;

    try {
      const result = await databaseApi.getSchema(selectedDb);
      if (result.success) {
        setSchemaData(result);
      }
    } catch (error) {
      setSchemaData(null);
    }
  };

  const handleShowDBInfo = async () => {
    if (dbStatus === "Connected") {
      await fetchSchemaData();
      setShowDBInfo(true);
    }
  };

  // Simulate bot typing and response
  const simulateBotResponse = async (userMessage) => {
    setIsBotTyping(true);

    // Simulate thinking time
    await new Promise(resolve => setTimeout(resolve, 1500));

    const normalizedMessage = userMessage.toLowerCase().trim();
    let response = PREDEFINED_RESPONSES[normalizedMessage];

    if (!response) {
      // Default response for unknown queries
      response = {
        text: "I understand you're looking for data insights. While I process your specific query, here's an example of what I can do with your data.",
        sql: "SELECT * FROM your_data WHERE condition = 'example' LIMIT 5;",
        results: {
          headers: ["Example Column", "Sample Data"],
          rows: [
            ["Data Point 1", "Value 1"],
            ["Data Point 2", "Value 2"],
            ["Data Point 3", "Value 3"],
          ],
        },
        chartData: [
          { name: 'Sample A', value: 100 },
          { name: 'Sample B', value: 200 },
          { name: 'Sample C', value: 150 },
        ]
      };
    }

    setIsBotTyping(false);
    return response;
  };


  const chatBotResponse = async (userMsg, currentSelectedID) => {
    try {
      setIsBotTyping(true);
      const responseSQLBOT = await ChatWithSQL_API(userMsg, currentSelectedID);
      console.log(responseSQLBOT)
      
      setIsBotTyping(false);
      return responseSQLBOT;

    }
    catch (err) {
      console.log(err.message + 'error on chating with bot!')
      throw err;
    }
  }

  const handleSend = async () => {
    if (message.trim() === "") return;

    if (!selectedDb) {
      setChats((prev) => [
        ...prev,
        {
          type: "bot",
          text: "Please select a database before chatting.",
        },
      ]);
      setMessage("");
      return;
    }

    // Add user message immediately
    const userMessage = message.trim();
    const newChats = [...chats, { type: "user", text: userMessage }];
    setChats(newChats);
    setMessage("");

    if (dbStatus !== "Connected") {
      // Add status message for disconnected database
      setChats(prev => [...prev, {
        type: "bot",
        text: "Database is currently disconnected. Your message has been queued and will be processed once the connection is restored.",
        status: "disconnected"
      }]);
      return;
    }

    // Simulate bot response
    const botResponse = await simulateBotResponse(userMessage);

    // bot response from fastapi
    const botapi_response = await chatBotResponse(userMessage, currentSelectedID);

    setChats(prev => [...prev, {
      type: "bot",
      text: "I understand you're looking for data insights. While I process your specific query, here's an example of what I can do with your data.",
      sql: botapi_response.sql,
      results: botapi_response.data,
      chartData: botResponse.chartData
    }]);

    // setChats(prev => [...prev, {
    //   type: "bot",
    //   text: botResponse.text,
    //   sql: botResponse.sql,
    //   results: botResponse.results,
    //   chartData: botResponse.chartData
    // }]);
  };




  const handleDbSelect = async (e) => {
    const dbId = e.target.value.toString();
    setSelectedDb(dbId);
    const dbKey = getSelectedDbStorageKey();
    if (dbId) {
      getSessionIDWithDBID(dbId)
      sessionStorage.setItem(dbKey, dbId);
      localStorage.setItem(dbKey, dbId);

    } else {
      sessionStorage.removeItem(dbKey);
      localStorage.removeItem(dbKey);
    }
    setShowDBInfo(false);
  };

  const handleClearDb = () => {
    setSelectedDb("");
    const dbKey = getSelectedDbStorageKey();
    sessionStorage.removeItem(dbKey);
    localStorage.removeItem(dbKey);
    setShowDBInfo(false);
    setShowStatus(false);
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedItems({ ...copiedItems, [index]: true });
    setTimeout(() => {
      setCopiedItems({ ...copiedItems, [index]: false });
    }, 2000);
  };

  const handleEditMessage = (index) => {
    setMessage(chats[index].text);
    setEditingIndex(index);
    setTimeout(() => {
      document.querySelector('input[type="text"]')?.focus();
    }, 100);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setMessage("");
  };

  const toggleSummary = async (index) => {
    if (!expandedSummaries[index]) {
      setGeneratingSummary(prev => ({ ...prev, [index]: true }));
      // Simulate summary generation time
      await new Promise(resolve => setTimeout(resolve, 800));
      setGeneratingSummary(prev => ({ ...prev, [index]: false }));
    }
    setExpandedSummaries(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleVisualization = async (index) => {
    if (!activeVisualizations[index]) {
      setGeneratingVisualization(prev => ({ ...prev, [index]: true }));
      // Simulate visualization generation time
      await new Promise(resolve => setTimeout(resolve, 1000));
      setGeneratingVisualization(prev => ({ ...prev, [index]: false }));
    }
    setActiveVisualizations(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const generateSummary = (chat) => {
    if (!chat.results) return "";

    const headers = chat.results.headers;
    const rows = chat.results.rows;

    if (headers.includes("Revenue") || headers.some(h => h.toLowerCase().includes("revenue"))) {
      const revenueIndex = headers.findIndex(h =>
        h.toLowerCase().includes("revenue") || h.toLowerCase().includes("amount")
      );

      if (revenueIndex !== -1) {
        const total = rows.reduce((sum, row) => {
          const value = parseFloat(row[revenueIndex].replace(/[^0-9.]/g, ''));
          return sum + (isNaN(value) ? 0 : value);
        }, 0);

        const maxRow = rows.reduce((max, row) => {
          const value = parseFloat(row[revenueIndex].replace(/[^0-9.]/g, ''));
          return value > max.value ? { value, row } : max;
        }, { value: -Infinity, row: null });

        return `The data shows a total revenue of $${total.toLocaleString()}. 
        The highest revenue was generated by ${maxRow.row ? maxRow.row[0] : 'N/A'} with $${maxRow.value.toLocaleString()}.`;
      }
    }

    return `This dataset contains ${rows.length} records with ${headers.length} fields. 
    The data provides insights into ${headers.join(", ")} with comprehensive metrics for analysis.`;
  };

  const renderChart = (chat, index) => {
    if (!chat.chartData) return null;

    const isPieChart = chat.results?.headers?.some(h =>
      h.toLowerCase().includes('category') || h.toLowerCase().includes('type')
    );

    if (isPieChart) {
      return (
        <div className="h-64 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chat.chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: $${value.toLocaleString()}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chat.chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Value']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return (
      <div className="h-64 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chat.chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
            <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Value']} />
            <Legend />
            <Bar dataKey={chat.chartData[0]?.revenue ? "revenue" : "value"} fill="#5D3FD3" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderChatMessage = (chat, index) => {
    if (chat.type === "user") {
      return (
        <div
          className="flex justify-end relative group"
          onMouseEnter={() => setHoveredMessage(index)}
          onMouseLeave={() => setHoveredMessage(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="max-w-3xl px-4 py-3 rounded-lg shadow-sm text-sm bg-[#5D3FD3] text-white rounded-br-none relative"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">{chat.text}</div>
              <div className="bg-white p-1 rounded-full flex-shrink-0">
                <FiUser className="text-[#5D3FD3]" size={14} />
              </div>
            </div>
            {(hoveredMessage === index || editingIndex === index) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex justify-end mt-2 space-x-1 absolute -bottom-2 right-0 bg-white rounded-tl-lg rounded-br-lg p-1 shadow-xs"
              >
                <button
                  onClick={() => handleEditMessage(index)}
                  className="p-1 rounded-full hover:bg-[#5D3FD3] transition-colors group/icon"
                  title="Edit message"
                >
                  <FiEdit3 size={12} className="text-[#5D3FD3] group-hover/icon:text-white" />
                </button>
                <button
                  onClick={() => copyToClipboard(chat.text, `user-${index}`)}
                  className="p-1 rounded-full hover:bg-[#5D3FD3] transition-colors group/icon"
                  title="Copy message"
                >
                  {copiedItems[`user-${index}`] ? (
                    <FiCheck size={12} className="text-green-500" />
                  ) : (
                    <FiCopy size={12} className="text-[#5D3FD3] group-hover/icon:text-white" />
                  )}
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      );
    } else if (chat.status === "disconnected") {
      return (
        <div className="flex justify-start">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-3xl px-4 py-3 rounded-lg shadow-sm text-sm bg-yellow-50 border border-yellow-200 rounded-bl-none"
          >
            <div className="flex items-center mb-2">
              <div className="bg-yellow-500 p-1 rounded-full mr-2">
                <FiDatabase className="text-white" size={14} />
              </div>
              <span className="text-xs text-yellow-700 font-medium">Database Status</span>
            </div>
            <div className="mb-3 text-yellow-700">{chat.text}</div>
            <div className="flex items-center mt-2">
              <button
                onClick={checkDbStatus}
                disabled={checkingDbStatus}
                className="flex items-center text-xs text-yellow-700 hover:text-yellow-800 disabled:opacity-50"
              >
                <FiRefreshCw className={`mr-1 ${checkingDbStatus ? 'animate-spin' : ''}`} size={12} />
                {checkingDbStatus ? 'Checking status...' : 'Retry connection'}
              </button>
            </div>
          </motion.div>
        </div>
      );
    } else {
      return (
        <div className="flex justify-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-3xl px-4 py-3 rounded-lg shadow-sm text-sm bg-gray-50 border border-gray-100 rounded-bl-none"
          >
            <div className="flex items-center mb-2">
              <div className="bg-[#5D3FD3] p-1 rounded-full mr-2">
                <FiMessageSquare className="text-white" size={14} />
              </div>
              <span className="text-xs text-[#5D3FD3] font-medium">QuantChat</span>
            </div>

            {chat.text && <div className="mb-3 text-gray-700">{chat.text}</div>}

            {chat.sql && (
              <div className="mb-4">
                <div className="flex items-center justify-between bg-gray-800 text-gray-100 px-3 py-2 rounded-t-md">
                  <span className="text-xs font-medium">SQLmessage:"We have some problem to connect the fastapi"</span>
                  <button
                    onClick={() => copyToClipboard(chat.sql, `sql-${index}`)}
                    className="text-gray-300 hover:text-white transition-colors flex items-center"
                  >
                    {copiedItems[`sql-${index}`] ? (
                      <>
                        <FiCheck className="text-green-400 mr-1" />
                        <span className="text-xs">Copied!</span>
                      </>
                    ) : (
                      <>
                        <FiCopy className="mr-1" />
                        <span className="text-xs">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-gray-900 text-gray-100 p-3 rounded-b-md overflow-x-auto text-xs font-mono">
                  {chat.sql}
                </pre>
              </div>
            )}

            {chat.results && (
              <div className="mt-4">
                <div className="text-xs font-medium text-gray-600 mb-2">
                  Query Results ({chat.results.length} rows):
                </div>
                <div className="border border-gray-200 rounded-md overflow-hidden shadow-xs mb-3 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        {Object.keys(chat.results[0]).map((header, i) => (
                          <th
                            key={i}
                            className="px-4 py-2.5 text-left text-xs font-medium text-gray-600 uppercase tracking-wider"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {chat.results.map((row, i) => (
                        <tr
                          key={i}
                          className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                          {Object.values(row).map((cell, j) => (
                            <td
                              key={j}
                              className="px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 mt-4">
                  <button
                    onClick={() => toggleSummary(index)}
                    disabled={generatingSummary[index]}
                    className="flex items-center text-xs text-[#5D3FD3] hover:text-[#6d4fe4] font-medium transition-colors disabled:opacity-50"
                  >
                    {generatingSummary[index] ? (
                      <>
                        <Sparkles className="mr-1 animate-pulse" size={12} />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FiBarChart2 className="mr-1" size={12} />
                        {expandedSummaries[index] ? 'Hide Summary' : 'Generate Summary'}
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => toggleVisualization(index)}
                    disabled={generatingVisualization[index]}
                    className="flex items-center text-xs text-[#5D3FD3] hover:text-[#6d4fe4] font-medium transition-colors disabled:opacity-50"
                  >
                    {generatingVisualization[index] ? (
                      <>
                        <BarChart3 className="mr-1 animate-pulse" size={12} />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FiPieChart className="mr-1" size={12} />
                        {activeVisualizations[index] ? 'Hide Visualization' : 'Visualize Data'}
                      </>
                    )}
                  </button>
                </div>

                {/* Summary Content */}
                <AnimatePresence>
                  {expandedSummaries[index] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-3 overflow-hidden"
                    >
                      <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-sm text-gray-700">
                        <div className="font-medium text-blue-700 mb-1 flex items-center">
                          <Sparkles className="mr-1" size={14} />
                          Data Summary
                        </div>
                        {generateSummary(chat)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Visualization Content */}
                <AnimatePresence>
                  {activeVisualizations[index] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-3 overflow-hidden"
                    >
                      <div className="bg-green-50 border border-green-100 rounded-md p-3">
                        <div className="font-medium text-green-700 mb-2 flex items-center">
                          <PieChartIcon className="mr-1" size={14} />
                          Data Visualization
                        </div>
                        {renderChart(chat, index)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      );
    }
  };

  const isChatBlocked = !selectedDb;
  const hasRealChats = chats.length > 0;

  return (
    <motion.div
      className="min-h-screen bg-gray-200 flex flex-col"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <FiDatabase className="text-xl text-[#5D3FD3]" />
          </div>
          <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200">
            <select
              value={selectedDb}
              onChange={handleDbSelect}
              className="bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#5D3FD3] focus:border-transparent rounded px-1 w-48 max-w-[180px] sm:max-w-none"
              disabled={dbLoading}
            >
              <option value="">Select Database</option>
              {databases.map((db) => (
                <option key={db.id} value={db.id}>
                  {db.name}
                </option>
              ))}
            </select>
            {selectedDb && (
              <motion.button
                onClick={handleClearDb}
                className="ml-1 px-2 py-1 text-xs rounded bg-gray-200 border border-gray-300 hover:bg-gray-300 text-gray-700 transition"
                title="Clear selection"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Clear
              </motion.button>
            )}

            <AnimatePresence mode="wait">
              {selectedDb && showStatus && dbStatus && (
                <motion.div
                  key="status-container"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex items-center space-x-1 ml-2 overflow-hidden"
                >
                  <motion.div
                    variants={statusVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex items-center space-x-1"
                  >
                    <FaCircle className={statusColors[dbStatus] + " text-xs"} />
                    <span className="text-xs text-gray-600 hidden sm:inline">{dbStatus}</span>
                    <motion.button
                      onClick={checkDbStatus}
                      disabled={checkingDbStatus}
                      className="ml-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                      title="Refresh status"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <FiRefreshCw className={checkingDbStatus ? 'animate-spin' : ''} size={12} />
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {selectedDb && dbStatus === "Connected" && (
              <button
                key="db-info-button"
                onClick={handleShowDBInfo}
                className="bg-[#5D3FD3] text-white font-semibold py-2 px-4 rounded hover:bg-[#6d4fe4] transition duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-[#5D3FD3] focus:ring-offset-2 flex items-center space-x-2"
                title="View Database Information"
              >
                <FiDatabase size={14} />
                <span>View DB Info</span>
              </button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Database Info Modal */}
      <AnimatePresence>
        {showDBInfo && selectedDbDetails && (
          <ViewSelectedDBInfo
            connection={selectedDbDetails}
            schemaData={schemaData}
            onClose={() => setShowDBInfo(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full">
          {hasRealChats ? (
            <>
              {chats.map((chat, index) => (
                <div key={index}>{renderChatMessage(chat, index)}</div>
              ))}
              {isBotTyping && <ThinkingAnimation />}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500 max-w-md mx-auto">
                <FiMessageSquare className="mx-auto text-4xl mb-4 text-gray-300" />
                <p className="text-lg mb-2">Select a database to start chatting</p>
                <p className="text-sm">Choose a database from the dropdown above to begin your conversation with QuantChat</p>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Input Container */}
        <div className="sticky bottom-0 left-0 right-0 bg-gray-200 border-t border-gray-300 z-10">
          <div className="max-w-4xl mx-auto w-full p-4">
            {editingIndex !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700 shadow-xs"
              >
                <div className="flex items-center">
                  <FiEdit3 className="mr-2 text-blue-500" size={14} />
                  <span>Editing message</span>
                </div>
                <button
                  onClick={cancelEdit}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm px-2 py-1 rounded-md hover:bg-blue-100 transition-colors"
                >
                  Cancel Edit
                </button>
              </motion.div>
            )}

            <div className="flex items-center space-x-2 w-full">
              <input
                type="text"
                placeholder={
                  !selectedDb
                    ? "Please select a database to chat."
                    : editingIndex !== null
                      ? "Edit your message..."
                      : "Ask about your data..."
                }
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5D3FD3] focus:border-transparent bg-white shadow-xs"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isBotTyping && handleSend()}
                disabled={isChatBlocked || isBotTyping}
              />
              <motion.button
                onClick={handleSend}
                className="p-3 rounded-lg bg-[#5D3FD3] text-white hover:bg-[#6d4fe4] transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                disabled={!message.trim() || isChatBlocked || isBotTyping}
                whileHover={{ scale: !message.trim() || isChatBlocked || isBotTyping ? 1 : 1.05 }}
                whileTap={{ scale: !message.trim() || isChatBlocked || isBotTyping ? 1 : 0.95 }}
              >
                {isBotTyping ? <LoadingDots /> : <FiSend className="text-lg" />}
              </motion.button>
            </div>

            <p className="text-xs text-gray-500 mt-2 text-center">
              {!selectedDb
                ? "Please select a database to chat."
                : dbStatus !== "Connected"
                  ? "Database is currently disconnected. Your messages will be queued for processing when the connection is restored."
                  : "QuantChat can make mistakes. Consider checking important information."
              }
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}