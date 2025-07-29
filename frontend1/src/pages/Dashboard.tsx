


import { useEffect, useState, type JSX } from 'react';
import { io, Socket } from 'socket.io-client';
import { Container, Typography, FormControl, InputLabel, Select, MenuItem, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Box, type SelectChangeEvent } from '@mui/material';
import Header from '../components/Header';
import axios from 'axios';

type IndicatorData = {
  [symbol: string]: {
    [timeframe: string]: {
      symbol: string;
      timeframe: string;
      indicators?: { [key: string]: any };
      [key: string]: any;
    };
  };
};

type Symbol = {
  _id: string;
  symbol: string;
  entryPrice: number;
  side: 'long' | 'short';
};

const Dashboard: React.FC = () => {
  const [indicators, setIndicators] = useState<IndicatorData>({});
  const [, setRawData] = useState<IndicatorData>({});
  const [selectedSymbol, setSelectedSymbol] = useState<string>('VANTAGE:XAUUSD');
  const [availableTimeframes, setAvailableTimeframes] = useState<string[]>([]);
  const [buySymbols, setBuySymbols] = useState<Symbol[]>([]);
  const [sellSymbols, setSellSymbols] = useState<Symbol[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [marketData, setMarketData] = useState<{ [symbol: string]: { marketPrice: number; volume: number } }>({});

  const symbols = [
    { full: 'VANTAGE:XAUUSD', display: 'XAUUSD' },
    { full: 'VANTAGE:GER40', display: 'GER40' },
    { full: 'VANTAGE:NAS100', display: 'NAS100' },
    { full: 'VANTAGE:BTCUSD', display: 'BTCUSD' },
  ];

  const timeframeLabels: { [key: string]: string } = {
    '15': '15m',
    '60': '1h',
    '240': '4h',
    '1D': '1D',
    '1W': '1W',
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const newSocket = io(import.meta.env.VITE_API_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    newSocket.on('connect', () => {
     // console.log(`[${new Date().toISOString()}] ✅ Connected to WebSocket server: ${newSocket.id}`);
      symbols.forEach(({ full }) => newSocket.emit('select-symbol', { symbol: full }));
    });

    newSocket.on('live-data-all', (data: any) => {
    //  console.log(`[${new Date().toISOString()}] Received live-data-all:`, JSON.stringify(data, null, 2));
      if (data.symbols && Array.isArray(data.symbols)) {
        const buy = data.symbols.filter((s: Symbol) => s.side === 'long');
        const sell = data.symbols.filter((s: Symbol) => s.side === 'short');
        setBuySymbols(buy);
        setSellSymbols(sell);
      } else {
        if (data.marketPrice || data.volume) {
          setMarketData((prev) => ({
            ...prev,
            [data.symbol]: {
              marketPrice: data.marketPrice || prev[data.symbol]?.marketPrice || 0,
              volume: data.volume || prev[data.symbol]?.volume || 0,
            },
          }));
        }
        setRawData((prev) => {
          const newData = structuredClone(prev);
          newData[data.symbol] = {
            ...(newData[data.symbol] || {}),
            [data.timeframe]: data,
          };
          return newData;
        });
        setIndicators((prev) => {
          const newIndicators = structuredClone(prev);
          const symbolData = newIndicators[data.symbol] || {};
          const timeframeData = symbolData[data.timeframe] || { symbol: data.symbol, timeframe: data.timeframe, indicators: {} };
          
          const mergedIndicators = {
            ...timeframeData.indicators,
            ...data.indicators,
            ...(data.EMA50 && { EMA50: data.EMA50 }),
            ...(data.EMA200 && { EMA200: data.EMA200 }),
            ...(data.RSI && { RSI: data.RSI }),
            ...(data.MACD && { MACD: data.MACD }),
            ...(data.FibonacciBollingerBands && { FibonacciBollingerBands: data.FibonacciBollingerBands }),
            ...(data.VWAP && { VWAP: data.VWAP }),
            ...(data.BollingerBands && { BollingerBands: data.BollingerBands }),
            ...(data.CandlestickPatterns && { CandlestickPatterns: data.CandlestickPatterns }),
            ...(data['Nadaraya-Watson-LuxAlgo'] && { 'Nadaraya-Watson-LuxAlgo': data['Nadaraya-Watson-LuxAlgo'] }),
            ...(data.SRv2 && { SRv2: data.SRv2 }),
            ...(data['Pivot Points High Low'] && { 'Pivot Points High Low': data['Pivot Points High Low'] }),
            ...(data['Pivot Points Standard'] && { 'Pivot Points Standard': data['Pivot Points Standard'] }),
          };

          newIndicators[data.symbol] = {
            ...symbolData,
            [data.timeframe]: {
              ...timeframeData,
              indicators: mergedIndicators,
            },
          };
          return newIndicators;
        });
        setAvailableTimeframes((prev) => {
          if (!data.timeframe || !Object.keys(timeframeLabels).includes(data.timeframe)) {
            return prev;
          }
          const newTimeframes = [...new Set([...prev, data.timeframe])].sort((a, b) => {
            const order = ['15', '60', '240', '1D', '1W'];
            return order.indexOf(a) - order.indexOf(b);
          });
          return newTimeframes;
        });
      }
    });

    newSocket.on('disconnect', () => {
    //  console.log(`[${new Date().toISOString()}] ❌ Disconnected from WebSocket server`);
    });

    newSocket.on('connect_error', (error) => {
     console.error(`[${new Date().toISOString()}] WebSocket connection error: ${error.message}`);
    });

    setSocket(newSocket);

    const fetchSymbols = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/symbols`);
        if (response.data.success && Array.isArray(response.data.symbols)) {
          setBuySymbols(response.data.symbols.filter((s: Symbol) => s.side === 'long'));
          setSellSymbols(response.data.symbols.filter((s: Symbol) => s.side === 'short'));
        } else {
          setBuySymbols([]);
          setSellSymbols([]);
        }
      } catch (error) {
      //  console.error('Failed to fetch symbols:', error);
        setBuySymbols([]);
        setSellSymbols([]);
      }
    };
    fetchSymbols();

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket && selectedSymbol) {
      socket.emit('select-symbol', { symbol: selectedSymbol });
    //  console.log(`[${new Date().toISOString()}] Emitted select-symbol: ${selectedSymbol}`);
    }
  }, [selectedSymbol, socket]);

  const handleSymbolChange = (event: SelectChangeEvent) => {
    setSelectedSymbol(event.target.value as string);
  //  console.log(`[${new Date().toISOString()}] Symbol changed to: ${event.target.value}`);
  };

  const formatValue = (val: any, indicatorKey: string): JSX.Element | string => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'string') return val;
    if (typeof val === 'number') {
      if (val > 1e10 || val === 1e100) return '-';
      return val.toFixed(2);
    }
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (Array.isArray(val)) {
      if (val.length === 0) return '[]';
      if (val[0] && typeof val[0] === 'object') {
        return (
          <Box>
            {val.map((item: any, index: number) => (
              <Box key={index}>
                {Object.entries(item).map(([key, value]) => (
                  value !== 1e100 && (
                    <Box key={key} sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                      {`${key}: ${formatValue(value, indicatorKey)}`}
                    </Box>
                  )
                ))}
              </Box>
            ))}
          </Box>
        );
      }
      return val[val.length - 1]?.toFixed(2) || '';
    }
    if (typeof val === 'object') {
    //  console.log(`[${new Date().toISOString()}] Processing ${indicatorKey} data:`, JSON.stringify(val, null, 2));
      if (indicatorKey === 'CandlestickPatterns') {
        const activePatterns = Object.entries(val)
          .filter(([key, value]) => value === 1 && key !== '$time')
          .map(([key]) => key);
        return activePatterns.length > 0 ? (
          <Box sx={{ fontWeight: 'normal', color: '#e0f808ff', fontSize: '0.9rem' }}>{activePatterns.join(', ')}</Box>
        ) : (
          'None'
        );
      }
      if (indicatorKey === 'Nadaraya-Watson-LuxAlgo') {
        const lines = val.lines || [];
        const sortedLines = [...lines].sort((a, b) => Math.max(b.y1, b.y2) - Math.max(a.y1, a.y2));
        return (
          <Box>
            {sortedLines.map((line: any, index: number) => {
              const isLowerBand = index === 1;
              return (
                <Box key={index}>
                  <Box
                    sx={{
                      fontWeight: 'bold',
                      color: isLowerBand ? '#ff0000' : '#36f236ff',
                      fontSize: '0.9rem',
                    }}
                  >
                    {isLowerBand ? 'LowerBand' : 'UpperBand'}
                  </Box>
                  <Box sx={{ color: isLowerBand ? '#ff0000' : '#36f236ff', fontSize: '0.9rem' }}>
                    {`y1=${line.y1.toFixed(2)}, y2=${line.y2.toFixed(2)}`}
                  </Box>
                  {index === 0 && <Box sx={{ my: 1, borderBottom: '1px solid #ccc', width: '60%', mx: 'auto' }} />}
                </Box>
              );
            })}
          </Box>
        );
      }
      if (indicatorKey === 'Pivot Points High Low') {
      const pivotPoints = val.processedPivotPoints || [];
  const currentPrice = marketData[selectedSymbol]?.marketPrice || 3313.8; // Default to provided market price
  const displayItems = currentPrice > 0
    ? [
        ...pivotPoints.filter((point: any) => parseFloat(point.value) >= currentPrice),
        { id: 'current-price', value: `Current Price = ${currentPrice.toFixed(2)}`, count: 0, difference: '-', isCurrentPrice: true, y: currentPrice },
        ...pivotPoints.filter((point: any) => parseFloat(point.value) < currentPrice),
      ]
    : pivotPoints;
        return (
          <Box>
            {displayItems.map((item: any, index: number) => (
              <Box
                key={item.id || index}
                sx={{
                  fontWeight: 'bold',
                  color: item.isCurrentPrice ? '#11b3d8ff' : parseFloat(item.value) >= currentPrice ? '#ff0000' : '#008000',
                  mt: index > 0 && pivotPoints.length > 0 && parseFloat(item.value) < currentPrice && parseFloat(displayItems[index - 1].value) >= currentPrice ? 1 : 0,
                  fontSize: '0.9rem',
                }}
              >
                {item.value}
                {!item.isCurrentPrice && (
                  <Box sx={{ fontWeight: 'normal', color: '#ffffff', fontSize: '0.8rem' }}>
                    Count: {item.count}, Diff: {item.difference}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        );
      }



      if (indicatorKey === 'SRv2 Support' || indicatorKey === 'SRv2 Resistance') {
        const labels = val?.labels || [];
        const currentPrice = marketData[selectedSymbol]?.marketPrice || 0;
        const isSupport = indicatorKey === 'SRv2 Support';
        const allLevels = labels
          .filter((label: any) => label && typeof label.y === 'number')
          .map((label: any) => ({
            id: label.id || `label-${Math.random()}`,
            text: label.text || (label.y <= currentPrice ? 'Support' : 'Resistance'),
            y: label.y,
            isSupport: label.text?.toLowerCase().includes('support') || label.y <= currentPrice,
          }));
        const supportLevels = allLevels.filter((label: any) => label.isSupport && label.y <= currentPrice);
        const resistanceLevels = allLevels.filter((label: any) => !label.isSupport && label.y > currentPrice);
        const maxSupport = supportLevels.length > 0 ? Math.max(...supportLevels.map((l: any) => l.y)) : -Infinity;
        const minResistance = resistanceLevels.length > 0 ? Math.min(...resistanceLevels.map((l: any) => l.y)) : Infinity;
        const showCurrentPrice = currentPrice > 0 && !isSupport && currentPrice > maxSupport && currentPrice <= minResistance;
        const filteredLevels = isSupport ? supportLevels : resistanceLevels;
        const displayItems = showCurrentPrice
          ? [
              ...filteredLevels.filter((level: any) => level.y > currentPrice),
              { id: 'current-price', text: `Current Price`, y: currentPrice, isCurrentPrice: true },
              ...filteredLevels.filter((level: any) => level.y <= currentPrice),
            ]
          : filteredLevels;
      //  console.log(`[${new Date().toISOString()}] ${indicatorKey} levels for ${selectedSymbol}:`, JSON.stringify(displayItems, null, 2));
        return (
          <Box>
            {displayItems.length > 0 ? (
              displayItems
                .sort((a: any, b: any) => b.y - a.y)
                .map((item: any, index: number) => (
                  <Box
                    key={item.id}
                    sx={{
                      fontWeight: 'bold',
                      color: item.isCurrentPrice ? '#11b3d8ff' : isSupport ? '#33ef33ff' : '#ff0000',
                      mt: index > 0 && filteredLevels.length > 0 && item.y < currentPrice && filteredLevels[index - 1]?.y >= currentPrice ? 1 : 0,
                      fontSize: '0.9rem',
                    }}
                  >
                    {item.text} = {item.y.toFixed(2)}
                  </Box>
                ))
            ) : (
              <Box sx={{ fontSize: '0.9rem' }}>No {isSupport ? 'support' : 'resistance'} levels available</Box>
            )}
          </Box>
        );
      }



 if (indicatorKey === 'Pivot Points Standard' || indicatorKey === 'Pivot Points Standard Resistance' || indicatorKey === 'Pivot Points Standard Support') {
 const labels = val.labels || [];
const currentPrice = marketData[selectedSymbol]?.marketPrice || 0;
const isSupport = indicatorKey === 'Pivot Points Standard Support';
const isPivot = indicatorKey === 'Pivot Points Standard';
const allLevels = labels.map((label: any) => {
  const y = parseFloat(label.text.match(/\((\d+\.?\d*)\)/)?.[1] || '0');
  const isPivotLabel = label.text.includes('P (');
  const isDynamicSupport = !isPivotLabel && y <= currentPrice; // Levels at or below current price are support
  const isDynamicResistance = !isPivotLabel && y > currentPrice; // Levels above current price are resistance
  return {
    text: label.text,
    y,
    isSupport: isDynamicSupport,
    isPivot: isPivotLabel,
    isResistance: isDynamicResistance,
  };
});
const supportLevels = allLevels.filter((label: any) => label.isSupport && !label.isPivot);
const resistanceLevels = allLevels.filter((label: any) => label.isResistance);
const pivotLevels = allLevels.filter((label: any) => label.isPivot);
/*
const maxSupport = supportLevels.length > 0 ? Math.max(...supportLevels.map((l: any) => l.y)) : -Infinity;
const minResistance = resistanceLevels.length > 0 ? Math.min(...resistanceLevels.map((l: any) => l.y)) : Infinity;
const maxPivot = pivotLevels.length > 0 ? Math.max(...pivotLevels.map((l: any) => l.y)) : -Infinity;
const minPivot = pivotLevels.length > 0 ? Math.min(...pivotLevels.map((l: any) => l.y)) : Infinity;
// Show current price when it exists and not in support or pivot mode
*/
const showCurrentPrice = currentPrice > 0 && !isSupport && !isPivot;
const filteredLevels = isSupport ? supportLevels : isPivot ? pivotLevels : resistanceLevels;
const displayItems = showCurrentPrice
  ? [
      ...filteredLevels.filter((level: any) => level.y > currentPrice),
      { id: 'current-price', text: `Current Price = ${currentPrice.toFixed(2)}`, y: currentPrice, isCurrentPrice: true },
      ...filteredLevels.filter((level: any) => level.y <= currentPrice),
    ]
  : filteredLevels;
return (
  <Box>
    {displayItems.length > 0 ? (
      displayItems
        .sort((a: any, b: any) => b.y - a.y)
        .map((item: any, index: number) => (
          <Box
            key={item.id || item.text}
            sx={{
              fontWeight: 'bold',
              color: item.isCurrentPrice ? '#11b3d8ff' : item.isSupport ? '#33ef33ff' : item.isPivot ? '#ffd700' : '#ff0000',
              mt: index > 0 && filteredLevels.length > 0 && item.y < currentPrice && filteredLevels[index - 1]?.y >= currentPrice ? 1 : 0,
              fontSize: '0.9rem',
            }}
          >
            {item.text}
          </Box>
        ))
    ) : (
      <Box sx={{ fontSize: '0.9rem' }}>No {isSupport ? 'support' : isPivot ? 'pivot' : 'resistance'} levels available</Box>
    )}
  </Box>
); }


 const relevantFields: Record<string, string[]> = {
        EMA50: ['EMA'],
        EMA200: ['EMA'],
        RSI: ['RSI', 'RSIbased_MA'],
        MACD: ['Histogram', 'MACD', 'Signal'],
        FibonacciBollingerBands: [
          '1_2', '0764_2', '0618_2', '05', '0382', '0236',
          'Plot', '0236_2', '0382_2', '05_2', '0618', '0764', '1',
        ],
        VWAP: [
          'Upper_Band_3', 'Upper_Band_2', 'Upper_Band_1', 'VWAP',
          'Lower_Band_1', 'Lower_Band_2', 'Lower_Band_3',
        ],
        BollingerBands: ['Upper', 'Basis', 'Lower'],
      };
      const fields = relevantFields[indicatorKey] || Object.keys(val);
      return (
        <Box>
          {fields.map((key) =>
            val[key] !== undefined && val[key] !== 1e100 ? (
              <Box
                key={key}
                sx={{
                  fontWeight: 'bold',
                  color:
                    indicatorKey === 'EMA50' ? '#1e90ff' :
                    indicatorKey === 'EMA200' ? '#ffd700' :
                    indicatorKey === 'RSI' ? '#ec10fbff' :
                    indicatorKey === 'MACD' && key === 'Histogram' ? '#93ed93ff' :
                    indicatorKey === 'MACD' && key === 'MACD' ? '#1e90ff' :
                    indicatorKey === 'MACD' && key === 'Signal' ? '#ff8c00' :
                    indicatorKey === 'FibonacciBollingerBands' && key === '1_2' ? '#ff0000' :
                    indicatorKey === 'FibonacciBollingerBands' && key === 'Plot' ? '#ec10fbff' :
                    indicatorKey === 'FibonacciBollingerBands' && key === '1' ? '#a1e9a1ff' :
                    indicatorKey === 'VWAP' && key === 'VWAP' ? '#9b62f0ff' :
                    indicatorKey === 'VWAP' && key === 'Upper_Band_1' ? '#ff0000' :
                    indicatorKey === 'VWAP' && key === 'Lower_Band_1' ? '#70eb70ff' :
                    indicatorKey === 'VWAP' && key === 'Upper_Band_2' ? '#ff0000' :
                    indicatorKey === 'VWAP' && key === 'Lower_Band_2' ? '#70eb70ff' :
                    indicatorKey === 'VWAP' && key === 'Upper_Band_3' ? '#ff0000' :
                    indicatorKey === 'VWAP' && key === 'Lower_Band_3' ? '#70eb70ff' :
                    indicatorKey === 'BollingerBands' && key === 'Basis' ? '#ef2a83ff' :
                    indicatorKey === 'BollingerBands' && key === 'Upper' ? '#ff0000' :
                    indicatorKey === 'BollingerBands' && key === 'Lower' ? '#83e683ff' :
                    '#11b3d8ff',
                  fontSize: '0.9rem',
                }}
              >
                {`${key}: ${formatValue(val[key], indicatorKey)}`}
              </Box>
            ) : null
          )}
        </Box>
      );
    }
    return String(val);
  };

  type IndicatorDefinition = {
    name: string;
    key: string;
    format: (val: any, key: string) => JSX.Element | string;
    color?: string | Record<string, string>;
  };

  const indicatorDefinitions: IndicatorDefinition[] = [
    { name: 'EMA50', key: 'EMA50', format: formatValue, color: '#1e90ff' },
    { name: 'EMA200', key: 'EMA200', format: formatValue, color: '#ffd700' },
    { name: 'RSI', key: 'RSI', format: formatValue, color: '#f535f5ff' },
    {
      name: 'MACD',
      key: 'MACD',
      format: formatValue,
      color: { Histogram: '#5891f2ff', MACD: '#1e90ff', Signal: '#ff8c00' },
    },
    {
      name: 'Fibonacci Bollinger Bands',
      key: 'FibonacciBollingerBands',
      format: formatValue,
      color: { '1': '#43d2eeff', Plot: '#ff00ff', '1_2': '#008000' },
    },
    {
      name: 'VWAP',
      key: 'VWAP',
      format: formatValue,
      color: {
        VWAP: '#9b62f0ff',
        Upper_Band_1: '#ff0000',
        Upper_Band_2: '#ff0000',
        Upper_Band_3: '#ff0000',
        Lower_Band_1: '#70eb70ff',
        Lower_Band_2: '#70eb70ff',
        Lower_Band_3: '#70eb70ff',
      },
    },
    {
      name: 'Bollinger Bands',
      key: 'BollingerBands',
      format: formatValue,
      color: { Basis: '#ef2a83ff', Upper: '#ff0000', Lower: '#008000' },
    },
    { name: 'Candlestick Patterns', key: 'CandlestickPatterns', format: formatValue, color: '#eaf207ff' },
    {
      name: 'Nadaraya-Watson-LuxAlgo',
      key: 'Nadaraya-Watson-LuxAlgo',
      format: formatValue,
      color: { UpperBand: '#2eef2eff', LowerBand: '#ff0000' },
    },
    {
      name: 'SRv2 Resistance',
      key: 'SRv2 Resistance',
      format: formatValue,
      color: { Resistance: '#ff0000' },
    },
    {
      name: 'SRv2 Support',
      key: 'SRv2 Support',
      format: formatValue,
      color: { Support: '#2eef2eff' },
    },
    {
      name: 'Pivot Points High Low',
      key: 'Pivot Points High Low',
      format: formatValue,
      color: { Resistance: '#ff0000', Support: '#008000' },
    },
    {
      name: 'Pivot Points Standard',
      key: 'Pivot Points Standard',
      format: formatValue,
      color: { Pivot: '#ffd700', Resistance: '#ff0000', Support: '#008000' },
    },
    {
      name: 'Pivot Points Standard Resistance',
      key: 'Pivot Points Standard Resistance',
      format: formatValue,
      color: { Resistance: '#ff0000' },
    },
    {
      name: 'Pivot Points Standard Support',
      key: 'Pivot Points Standard Support',
      format: formatValue,
      color: { Support: '#2eef2eff' },
    },
  ];

  const filteredIndicatorDefinitions = indicatorDefinitions.filter(indicator => {
    const symbolData = indicators[selectedSymbol];
    if (!symbolData) return false;
    if (indicator.key === 'SRv2 Support' || indicator.key === 'SRv2 Resistance') {
      const hasSRv2Data = Object.keys(symbolData).some(timeframe => {
        const srv2Data = symbolData[timeframe]?.indicators?.['SRv2'] || symbolData[timeframe]?.['SRv2'];
      //  console.log(`[${new Date().toISOString()}] Checking SRv2 for ${selectedSymbol}, timeframe ${timeframe}:`, JSON.stringify(srv2Data, null, 2));
        return srv2Data && Array.isArray(srv2Data.labels) && srv2Data.labels.length > 0;
      });
      return hasSRv2Data;
    }
    if (indicator.key === 'Pivot Points Standard' || indicator.key === 'Pivot Points Standard Resistance' || indicator.key === 'Pivot Points Standard Support') {
      const hasPivotData = Object.keys(symbolData).some(timeframe => {
        const pivotData = symbolData[timeframe]?.indicators?.['Pivot Points Standard'] || symbolData[timeframe]?.['Pivot Points Standard'];
      //  console.log(`[${new Date().toISOString()}] Checking Pivot Points Standard for ${selectedSymbol}, timeframe ${timeframe}:`, JSON.stringify(pivotData, null, 2));
        return pivotData && Array.isArray(pivotData.labels) && pivotData.labels.length > 0;
      });
      return hasPivotData;
    }
    return Object.keys(symbolData).some(timeframe => {
      return symbolData[timeframe]?.indicators?.[indicator.key] !== undefined ||
             symbolData[timeframe]?.[indicator.key] !== undefined;
    });
  });

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Header />
      <Container sx={{ py: '2rem' }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
          <Card sx={{ flex: 1, maxWidth: 800, height: 'auto', borderRadius: 2, boxShadow: 3, border: '2px solid #4CAF50' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ color: '#4CAF50', mb: 1, fontWeight: 500 }}>
                💰 Buy Levels (All Symbols)
              </Typography>
              <Table sx={{ minWidth: 300 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.paper', p: 1 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.paper', p: 1 }}>Symbol</TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.paper', p: 1 }}>Entry Price</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {buySymbols.map((symbol) => {
                    const displaySymbol = symbols.find(s => s.full === symbol.symbol)?.display || symbol.symbol;
                    return (
                      <TableRow key={symbol._id}>
                        <TableCell sx={{ color: '#4CAF50', p: 1 }}>Buy</TableCell>
                        <TableCell sx={{ p: 1 }}>{displaySymbol}</TableCell>
                        <TableCell sx={{ p: 1 }}>{symbol.entryPrice.toFixed(6)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {buySymbols.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ p: 1 }}>
                        <Typography color="text.secondary" variant="body2">No Buy levels received</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1, maxWidth: 700, height: 'auto', borderRadius: 2, boxShadow: 3, border: '2px solid #F44336' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ color: '#F44336', mb: 1, fontWeight: 500 }}>
                💰 Sell Levels (All Symbols)
              </Typography>
              <Table sx={{ minWidth: 300 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.paper', p: 1 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.paper', p: 1 }}>Symbol</TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.paper', p: 1 }}>Entry Price</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sellSymbols.map((symbol) => {
                    const displaySymbol = symbols.find(s => s.full === symbol.symbol)?.display || symbol.symbol;
                    return (
                      <TableRow key={symbol._id}>
                        <TableCell sx={{ color: '#F44336', p: 1 }}>Sell</TableCell>
                        <TableCell sx={{ p: 1 }}>{displaySymbol}</TableCell>
                        <TableCell sx={{ p: 1 }}>{symbol.entryPrice.toFixed(6)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {sellSymbols.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ p: 1 }}>
                        <Typography color="text.secondary" variant="body2">No Sell levels received</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Box>

        <Card sx={{ mb: 4, borderRadius: 3, boxShadow: 4 }}>
          <CardContent sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="symbol-select-label">Select Symbol</InputLabel>
              <Select
                labelId="symbol-select-label"
                id="symbol-select"
                value={selectedSymbol}
                onChange={handleSymbolChange}
                label="Select Symbol"
              >
                {symbols.map(({ full, display }) => (
                  <MenuItem key={full} value={full}>
                    {display}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>

        <Card sx={{ mb: 4, borderRadius: 3, boxShadow: 4, overflow: 'auto' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" sx={{ color: '#1e90ff', fontWeight: 600, mr: 2 }}>
                Symbol: {symbols.find(s => s.full === selectedSymbol)?.display || selectedSymbol}
              </Typography>
              {marketData[selectedSymbol] && (
                <>
                  <Typography variant="h5" sx={{ color: '#11b3d8ff', fontWeight: 600, mr: 2 }}>
                    Current Price: {marketData[selectedSymbol].marketPrice.toFixed(2)}
                  </Typography>
                  <Typography variant="h5" sx={{ color: '#11b3d8ff', fontWeight: 600 }}>
                    Volume: {marketData[selectedSymbol].volume.toFixed(2)}
                  </Typography>
                </>
              )}
            </Box>
            {indicators[selectedSymbol] ? (
              <Box sx={{ maxHeight: '500px', overflowY: 'auto', overflowX: 'auto' }}>
                <Table sx={{ minWidth: 650, tableLayout: 'fixed' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          backgroundColor: 'background.paper',
                          position: 'sticky',
                          top: 0,
                          left: 0,
                          zIndex: 3,
                          minWidth: 200,
                          borderRight: '1px solid #ccc',
                        }}
                      >
                        Indicator
                      </TableCell>
                      {availableTimeframes.map((timeframe) => (
                        <TableCell
                          key={timeframe}
                          align="center"
                          sx={{
                            fontWeight: 600,
                            backgroundColor: 'background.paper',
                            position: 'sticky',
                            top: 0,
                            zIndex: 2,
                            minWidth: 150,
                          }}
                        >
                          {timeframeLabels[timeframe] || timeframe}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredIndicatorDefinitions.map((indicator) => {
                      const nameColor =
                        ['EMA50', 'EMA200', 'RSI', 'MACD', 'FibonacciBollingerBands', 'VWAP', 'BollingerBands', 'CandlestickPatterns', 'Nadaraya-Watson-LuxAlgo'].includes(indicator.key)
                          ? typeof indicator.color === 'string'
                            ? indicator.color
                            : indicator.color ? indicator.color[Object.keys(indicator.color)[0]] : 'inherit'
                          : indicator.key === 'SRv2 Resistance' || indicator.key === 'Pivot Points Standard Resistance'
                          ? '#ff0000'
                          : indicator.key === 'SRv2 Support' || indicator.key === 'Pivot Points Standard Support'
                          ? '#1cf01cff'
                          : indicator.key === 'Pivot Points Standard'
                          ? '#ffd700'
                          : 'inherit';
                    //  console.log(`[${new Date().toISOString()}] Styling indicator ${indicator.name} with color: ${nameColor}`);
                      return (
                        <TableRow key={indicator.name}>
                          <TableCell
                            sx={{
                              fontWeight: 500,
                              color: nameColor,
                              backgroundColor: 'background.paper',
                              borderRight: '1px solid #ccc',
                              fontSize: '0.9rem',
                            }}
                          >
                            {indicator.name}
                          </TableCell>
                          {availableTimeframes.map((timeframe) => {
                            const currentValue = indicator.key === 'SRv2 Support' || indicator.key === 'SRv2 Resistance'
                              ? indicators[selectedSymbol]?.[timeframe]?.indicators?.['SRv2'] ?? 
                                indicators[selectedSymbol]?.[timeframe]?.['SRv2']
                              : indicator.key === 'Pivot Points Standard' || indicator.key === 'Pivot Points Standard Resistance' || indicator.key === 'Pivot Points Standard Support'
                              ? indicators[selectedSymbol]?.[timeframe]?.indicators?.['Pivot Points Standard'] ?? 
                                indicators[selectedSymbol]?.[timeframe]?.['Pivot Points Standard']
                              : indicators[selectedSymbol]?.[timeframe]?.indicators?.[indicator.key] ?? 
                                indicators[selectedSymbol]?.[timeframe]?.[indicator.key];
                            const hasData = indicator.key === 'SRv2 Support' || indicator.key === 'SRv2 Resistance'
                              ? currentValue && Array.isArray(currentValue.labels) && currentValue.labels.length > 0
                              : indicator.key === 'Pivot Points Standard' || indicator.key === 'Pivot Points Standard Resistance' || indicator.key === 'Pivot Points Standard Support'
                              ? currentValue && Array.isArray(currentValue.labels) && currentValue.labels.length > 0
                              : currentValue !== undefined && currentValue !== null;
                            if (indicator.key === 'Pivot Points High Low' && hasData && Array.isArray(currentValue.processedPivotPoints) && currentValue.processedPivotPoints.length > 0) {
                              const currentPrice = marketData[selectedSymbol]?.marketPrice || 3336.99;
                              return (
                                <TableCell
                                  key={timeframe}
                                  align="center"
                                  sx={{
                                    fontSize: '0.3rem',
                                    padding: 0,
                                    verticalAlign: 'top',
                                  }}
                                >
                                  <Card      
                                  sx={{ maxHeight: '300px', overflowY: 'auto', borderRadius: 1, boxShadow: 2, m: 1 ,
                             '&::-webkit-scrollbar': {
                                     width: '6px',
                                                    },
                                '&::-webkit-scrollbar-track': {
                                    background: '#dfdae0ff',
                                                              },
                                 '&::-webkit-scrollbar-thumb': {
                                    background: '#888',
                                               borderRadius: '6px',
                                                       },
                                   '&::-webkit-scrollbar-thumb:hover': {
                                      background: '#555',
                                                  },}}>
                                    <CardContent sx={{ p: 1 }}>
                                      <Table sx={{ minWidth: '100%', tableLayout: 'fixed' }}>
                                        <TableHead>
                                          <TableRow>
                                            <TableCell
                                              sx={{
                                                fontWeight: 600,
                                                backgroundColor: 'background.paper',
                                                position: 'sticky',
                                                top: 0,
                                                zIndex: 2,
                                                fontSize: '0.8rem',
                                                padding: '1px',
                                              }}
                                            >
                                              Value
                                            </TableCell>
                                            <TableCell
                                              sx={{
                                                fontWeight: 600,
                                                backgroundColor: 'background.paper',
                                                position: 'sticky',
                                                top: 0,
                                                zIndex: 2,
                                                fontSize: '0.8rem',
                                                padding: '4px',
                                              }}
                                            >
                                              Count
                                            </TableCell>
                                            <TableCell
                                              sx={{
                                                fontWeight: 600,
                                                backgroundColor: 'background.paper',
                                                position: 'sticky',
                                                top: 0,
                                                zIndex: 2,
                                                fontSize: '0.8rem',
                                                padding: '4px',
                                              }}
                                            >
                                              Differe
                                            </TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {(() => {
                                            const rows: JSX.Element[] = [];
                                            currentValue.processedPivotPoints.forEach((point: any, index: number) => {
                                              const value =point.value;
                                              const diff = point.difference || '-'
                                              
                                              const isCurrentPrice = Math.abs(parseFloat(point.value) - currentPrice) < 0.01;

                                              rows.push(
                                                <TableRow key={`pivot-${timeframe}-${index}`}>
                                                  <TableCell
                                                    sx={{
                                                      fontWeight: isCurrentPrice ? 'bold' : 'normal',
                                                      color: isCurrentPrice
                                                        ? '#11b3d8ff'
                                                        : parseFloat(point.value) >= currentPrice
                                                        ? '#ff0000'
                                                        : '#008000',
                                                      fontSize: '0.8rem',
                                                      padding: '4px',
                                                    }}
                                                  >
                                                    {isCurrentPrice ? `Current Price = ${value}` : value}
                                                  </TableCell>
                                                  <TableCell sx={{ fontSize: '0.8rem', padding: '30px' }}>
                                                    {point.count}
                                                  </TableCell>
                                                  <TableCell sx={{ fontSize: '0.8rem', padding: '25px' }}>
                                                    {diff}
                                                  </TableCell>
                                                </TableRow>
                                              );
                                            });



                                            if (!currentValue.processedPivotPoints.some((p: any) => Math.abs(parseFloat(p.value) - currentPrice) < 0.01)) {
                  const insertIndex = rows.findIndex((row) => {
                    const valueText = row.props.children[0].props.children;
                    const value = typeof valueText === 'string'
                      ? valueText.startsWith('Current Price =')
                        ? parseFloat(valueText.replace('Current Price = ', '').trim().split(' ')[0])
                        : parseFloat(valueText.split(' ')[0])
                      : currentPrice + 1;
                    return value < currentPrice;
                  });
                  rows.splice(
                    insertIndex === -1 ? rows.length : insertIndex,                       
                                                0,
                                                <TableRow key={`current-price-${timeframe}`}>
                                                  <TableCell
                                                    sx={{
                                                      fontWeight: 'bold',
                                                      color: '#11b3d8ff',
                                                      fontSize: '0.8rem',
                                                      padding: '20px',
                                                    }}
                                                  >
                                                    Current Price = {currentPrice.toFixed(2)}
                                                  </TableCell>
                                            
                                                </TableRow>
                                              );
                                            }




                                            return rows;
                                          })()}
                                        </TableBody>
                                      </Table>
                                    </CardContent>
                                  </Card>
                                </TableCell>
                              );
                            }
                           // console.log(`[${new Date().toISOString()}] Rendering ${indicator.key} for ${selectedSymbol}, timeframe ${timeframe}, hasData: ${hasData}`, JSON.stringify(currentValue, null, 2));
                            return (
                              <TableCell
                                key={timeframe}
                                align="center"
                                sx={{
                                  fontWeight: 'bold',
                                  color:
                                    indicator.key === 'EMA50' ? '#1e90ff' :
                                    indicator.key === 'EMA200' ? '#ffd700' :
                                    indicator.key === 'RSI' ? '#f71ff7ff' :
                                    indicator.key === 'CandlestickPatterns' ? '#c6f170ff' :
                                    indicator.key === 'Nadaraya-Watson-LuxAlgo' ? '#9913ecff' :
                                    indicator.key === 'SRv2 Support' ? '#81ee42ff' :
                                    indicator.key === 'SRv2 Resistance' ? '#ff0000' :
                                    indicator.key === 'Pivot Points High Low' ? '#ff0000' :
                                    indicator.key === 'Pivot Points Standard' ? '#ffd700' :
                                    indicator.key === 'Pivot Points Standard Resistance' ? '#ff0000' :
                                    indicator.key === 'Pivot Points Standard Support' ? '#30e830ff' :
                                    '#efca12ff',
                                  fontSize: '0.6rem',
                                }}
                              >
                                {hasData ? indicator.format(currentValue || {}, indicator.key) : '-'}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            ) : (
              <Typography color="text.secondary">Waiting for indicator data for {symbols.find(s => s.full === selectedSymbol)?.display || selectedSymbol}...</Typography>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Dashboard;

