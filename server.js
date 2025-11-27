require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// CWA API 設定
const CWA_API_BASE_URL = "https://opendata.cwa.gov.tw/api";
const CWA_API_KEY = process.env.CWA_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * 取得天氣預報
 * CWA 氣象資料開放平臺 API
 * 使用「一般天氣預報-今明 36 小時天氣預報」資料集
 */
const getAllCityWeather = async (req, res) => {
  try {
    if (!CWA_API_KEY) {
      return res.status(500).json({
        error: "伺服器設定錯誤",
        message: "請在 .env 檔案中設定 CWA_API_KEY",
      });
    }

    // 呼叫 CWA API（36 小時天氣預報）
    const response = await axios.get(
      `${CWA_API_BASE_URL}/v1/rest/datastore/F-C0032-001`,
      {
        params: {
          Authorization: CWA_API_KEY,
        },
      }
    );

    const locations = response.data.records.location;
    if (!locations || locations.length === 0) {
      return res.status(404).json({
        error: "查無資料",
        message: "無法取得縣市天氣資料",
      });
    }

    // 整理所有縣市天氣資料
    const allCityWeather = locations.map((loc) => {
      const weatherElements = loc.weatherElement;
      const timeCount = weatherElements[0].time.length;

      const forecasts = [];

      for (let i = 0; i < timeCount; i++) {
        const forecast = {
          startTime: weatherElements[0].time[i].startTime,
          endTime: weatherElements[0].time[i].endTime,
          weather: "",
          rain: "",
          minTemp: "",
          maxTemp: "",
          comfort: "",
          windSpeed: "",
        };

        weatherElements.forEach((element) => {
          const value = element.time[i].parameter;
          switch (element.elementName) {
            case "Wx":
              forecast.weather = value.parameterName;
              break;
            case "PoP":
              forecast.rain = value.parameterName + "%";
              break;
            case "MinT":
              forecast.minTemp = value.parameterName + "°C";
              break;
            case "MaxT":
              forecast.maxTemp = value.parameterName + "°C";
              break;
            case "CI":
              forecast.comfort = value.parameterName;
              break;
            case "WS":
              forecast.windSpeed = value.parameterName;
              break;
          }
        });

        forecasts.push(forecast);
      }

      return {
        city: loc.locationName,
        forecasts,
      };
    });

    res.json({
      success: true,
      updateTime: response.data.records.datasetDescription,
      data: allCityWeather,
    });

  } catch (error) {
    console.error("取得全部縣市天氣資料失敗:", error.message);

    res.status(500).json({
      error: "伺服器錯誤",
      message: "無法取得全部縣市天氣資料",
    });
  }
};

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "歡迎使用 CWA 天氣預報 API",
    endpoints: {
      all: "/api/weather/getAllCityWeathe",
      health: "/api/health",
    },
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// 取得縣市天氣預報
app.get("/api/weather/getAllCityWeather", getAllCityWeather);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "伺服器錯誤",
    message: err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "找不到此路徑",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 伺服器運行已運作`);
  console.log(`📍 環境: ${process.env.NODE_ENV || "development"}`);
});
