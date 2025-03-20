import { ThemeProvider, createTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import React, { useState, useEffect } from "react";

// Material UI Icons
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import ResetIcon from "@mui/icons-material/RestartAlt";

// Twitter-like theme
const theme = createTheme({
  palette: {
    primary: {
      main: "#1DA1F2",
      light: "#60cbff",
      dark: "#0c85d0",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#14171A",
      light: "#657786",
      dark: "#000000",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f7f9fa",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
        },
      },
    },
  },
});

// 默认设置
const DEFAULT_SETTINGS = {
  // 用户界面设置
  uiSettings: {
    theme: "system",
    fontSize: 14,
    compactMode: false,
  },

  // 分析设置
  analysisSettings: {
    autoAnalyze: false,
    analysisDepth: "standard",
    showAdvancedMetrics: false,
    analysisCacheTime: 24,
  },

  // 搜索设置
  searchSettings: {
    searchResultsLimit: 10,
    sortBy: "relevance",
    includeVerifiedOnly: false,
  },

  // 隐私设置
  privacySettings: {
    saveSearchHistory: true,
    shareAnonymousUsage: false,
  },

  // Twitter API设置
  twitterApiSettings: {
    bearerToken: "",
    apiEnabled: false,
  },

  // AI模型设置
  aiModelSettings: {
    enabled: false,
    apiKey: "",
    modelId: "gpt-3.5-turbo",
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt:
      "你是一个专业的Twitter用户分析助手，善于分析用户的性格特征、兴趣爱好和沟通风格。请根据用户的推文内容进行分析并提供有用的见解。",
  },

  // 回复设置
  replySettings: {
    remindViewDetails: false,
    maxReplyLength: 140,
    useEmojis: true,
  },
};

function SimpleOptionsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "success" | "error" | "warning",
  });

  // 加载设置
  useEffect(() => {
    async function loadSettingsFromStorage() {
      try {
        // 尝试从后台脚本获取设置
        chrome.runtime.sendMessage({ type: "GET_APP_STATE" }, (response) => {
          if (
            response &&
            response.success &&
            response.state &&
            response.state.settings
          ) {
            setSettings(response.state.settings);
          } else {
            console.warn("无法从后台获取设置，使用默认值");
            setSettings(DEFAULT_SETTINGS);
          }
          setLoading(false);
        });
      } catch (error) {
        console.error("加载设置失败:", error);
        setSettings(DEFAULT_SETTINGS);
        setLoading(false);
      }
    }

    loadSettingsFromStorage();
  }, []);

  // 保存设置
  const saveSettings = () => {
    setSaving(true);

    chrome.runtime.sendMessage(
      {
        type: "UPDATE_SETTINGS",
        settings: settings,
      },
      (response) => {
        if (response && response.success) {
          setNotification({
            open: true,
            message: "设置已保存",
            severity: "success",
          });
        } else {
          setNotification({
            open: true,
            message: "保存设置失败",
            severity: "error",
          });
        }
        setSaving(false);
      }
    );
  };

  // 重置设置
  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    setNotification({
      open: true,
      message: "设置已重置（尚未保存）",
      severity: "info",
    });
  };

  // 关闭通知
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // 返回扩展
  const handleBackToExtension = () => {
    window.close();
  };

  // 测试Twitter API Token
  const testTwitterToken = () => {
    chrome.runtime.sendMessage(
      {
        type: "TEST_TWITTER_TOKEN",
        token: settings.twitterApiSettings.bearerToken,
      },
      (response) => {
        if (response && response.success) {
          setNotification({
            open: true,
            message: "Twitter API Token验证成功",
            severity: "success",
          });
        } else {
          setNotification({
            open: true,
            message: "Twitter API Token验证失败",
            severity: "error",
          });
        }
      }
    );
  };

  // 测试OpenAI API Key
  const testOpenAiApiKey = () => {
    chrome.runtime.sendMessage(
      {
        type: "TEST_OPENAI_API_KEY",
        apiKey: settings.aiModelSettings.apiKey,
      },
      (response) => {
        if (response && response.success) {
          setNotification({
            open: true,
            message: "OpenAI API密钥验证成功",
            severity: "success",
          });
        } else {
          setNotification({
            open: true,
            message: "OpenAI API密钥验证失败",
            severity: "error",
          });
        }
      }
    );
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            p: 3,
          }}
        >
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            加载设置中...
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          backgroundColor: "background.default",
          minHeight: "100vh",
          p: 3,
        }}
      >
        {/* 头部 */}
        <Paper
          elevation={1}
          sx={{
            p: 2,
            mb: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton onClick={handleBackToExtension} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5">Twitter分析助手 - 设置</Typography>
          </Box>
          <Box>
            <Button
              variant="outlined"
              startIcon={<ResetIcon />}
              onClick={resetSettings}
              sx={{ mr: 1 }}
            >
              重置
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={saveSettings}
              disabled={saving}
            >
              {saving ? "保存中..." : "保存设置"}
            </Button>
          </Box>
        </Paper>

        {/* Twitter API 设置 */}
        <Paper elevation={1} sx={{ mb: 3, p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Twitter API 设置
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.twitterApiSettings.apiEnabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      twitterApiSettings: {
                        ...settings.twitterApiSettings,
                        apiEnabled: e.target.checked,
                      },
                    })
                  }
                  color="primary"
                />
              }
              label="启用Twitter API搜索"
            />

            <TextField
              label="Twitter API Bearer Token"
              value={settings.twitterApiSettings.bearerToken}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  twitterApiSettings: {
                    ...settings.twitterApiSettings,
                    bearerToken: e.target.value,
                  },
                })
              }
              fullWidth
              margin="normal"
              type="password"
              variant="outlined"
              helperText="您的Twitter API Bearer Token，用于搜索和获取用户数据"
            />

            <Button
              variant="outlined"
              onClick={testTwitterToken}
              disabled={!settings.twitterApiSettings.bearerToken}
              sx={{ mt: 1, alignSelf: "flex-start" }}
            >
              测试Token
            </Button>
          </FormGroup>
        </Paper>

        {/* AI 设置 */}
        <Paper elevation={1} sx={{ mb: 3, p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            AI 设置
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.aiModelSettings.enabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      aiModelSettings: {
                        ...settings.aiModelSettings,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  color="primary"
                />
              }
              label="启用AI分析"
            />

            <TextField
              label="OpenAI API密钥"
              value={settings.aiModelSettings.apiKey}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  aiModelSettings: {
                    ...settings.aiModelSettings,
                    apiKey: e.target.value,
                  },
                })
              }
              fullWidth
              margin="normal"
              type="password"
              variant="outlined"
              helperText="您的OpenAI API密钥，用于与ChatGPT通信"
            />

            <Button
              variant="outlined"
              onClick={testOpenAiApiKey}
              disabled={!settings.aiModelSettings.apiKey}
              sx={{ mt: 1, mb: 2, alignSelf: "flex-start" }}
            >
              测试API密钥
            </Button>
          </FormGroup>
        </Paper>

        {/* 回复设置 */}
        <Paper elevation={1} sx={{ mb: 3, p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            回复设置
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.replySettings.remindViewDetails}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      replySettings: {
                        ...settings.replySettings,
                        remindViewDetails: e.target.checked,
                      },
                    })
                  }
                  color="primary"
                />
              }
              label="在回复中提醒查看详情"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.replySettings.useEmojis}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      replySettings: {
                        ...settings.replySettings,
                        useEmojis: e.target.checked,
                      },
                    })
                  }
                  color="primary"
                />
              }
              label="在回复中使用表情符号"
            />

            <TextField
              label="最大回复长度"
              type="number"
              value={settings.replySettings.maxReplyLength}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value > 0) {
                  setSettings({
                    ...settings,
                    replySettings: {
                      ...settings.replySettings,
                      maxReplyLength: value,
                    },
                  });
                }
              }}
              fullWidth
              margin="normal"
              variant="outlined"
              inputProps={{ min: 10, max: 280, step: 10 }}
              helperText="回复的最大字符数 (10-280)"
            />
          </FormGroup>
        </Paper>

        <Snackbar
          open={notification.open}
          autoHideDuration={5000}
          onClose={handleCloseNotification}
        >
          <Alert
            onClose={handleCloseNotification}
            severity={notification.severity}
            sx={{ width: "100%" }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default SimpleOptionsPage;
