'use client';

import { useState, useEffect, useCallback } from 'react';

interface HistoryRecord {
  id: number;
  expression: string;
  result: string;
  createdAt: string;
}

type CalcOperator = '+' | '-' | '*' | '/';

function formatDisplay(value: string): string {
  if (value === 'Error') return 'Error';
  if (value === 'Infinity' || value === '-Infinity') return 'Error';
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  if (value.endsWith('.')) return value;
  if (value.includes('.') && value.split('.')[1] === '') return value;
  return value;
}

function safeEval(expression: string): string {
  try {
    // Replace × and ÷ just in case
    const sanitized = expression
      .replace(/×/g, '*')
      .replace(/÷/g, '/');
    // Use Function constructor for safe evaluation
    // eslint-disable-next-line no-new-func
    const result = new Function('return ' + sanitized)();
    if (!isFinite(result) || isNaN(result)) return 'Error';
    // Round floating point issues
    const rounded = Math.round(result * 1e10) / 1e10;
    return String(rounded);
  } catch {
    return 'Error';
  }
}

export default function CalculatorPage() {
  const [display, setDisplay] = useState<string>('0');
  const [expression, setExpression] = useState<string>('');
  const [operator, setOperator] = useState<CalcOperator | null>(null);
  const [prevValue, setPrevValue] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false);
  const [fullExpression, setFullExpression] = useState<string>('');
  const [justEvaluated, setJustEvaluated] = useState<boolean>(false);

  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.history) setHistory(data.history);
    } catch (e) {
      console.error('Failed to fetch history', e);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const saveHistory = useCallback(async (expr: string, result: string) => {
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: expr, result }),
      });
    } catch (e) {
      console.error('Failed to save history', e);
    }
  }, []);

  const handleDigit = useCallback((digit: string) => {
    if (waitingForOperand || justEvaluated) {
      setDisplay(digit);
      setWaitingForOperand(false);
      setJustEvaluated(false);
    } else {
      if (display === '0' && digit !== '.') {
        setDisplay(digit);
      } else if (digit === '.' && display.includes('.')) {
        return;
      } else {
        setDisplay(display + digit);
      }
    }
  }, [display, waitingForOperand, justEvaluated]);

  const handleOperator = useCallback((op: CalcOperator) => {
    const current = display;

    if (justEvaluated) {
      setFullExpression(current + ' ' + op + ' ');
      setPrevValue(current);
      setOperator(op);
      setWaitingForOperand(true);
      setJustEvaluated(false);
      return;
    }

    if (operator && waitingForOperand) {
      setOperator(op);
      setFullExpression(fullExpression.slice(0, -3) + ' ' + op + ' ');
      return;
    }

    if (prevValue !== null && operator && !waitingForOperand) {
      const expr = prevValue + operator + current;
      const result = safeEval(expr);
      setDisplay(result);
      setFullExpression(result + ' ' + op + ' ');
      setPrevValue(result);
    } else {
      setFullExpression(current + ' ' + op + ' ');
      setPrevValue(current);
    }

    setOperator(op);
    setWaitingForOperand(true);
  }, [display, operator, prevValue, waitingForOperand, fullExpression, justEvaluated]);

  const handleEquals = useCallback(async () => {
    if (operator === null || prevValue === null) return;
    if (waitingForOperand) return;

    const current = display;
    const expr = prevValue + operator + current;
    const result = safeEval(expr);

    const humanExpr = fullExpression + current;
    setFullExpression(humanExpr + ' =');
    setDisplay(result);
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setJustEvaluated(true);

    if (result !== 'Error') {
      await saveHistory(humanExpr, result);
      if (showHistory) await fetchHistory();
    }
  }, [display, operator, prevValue, waitingForOperand, fullExpression, saveHistory, showHistory, fetchHistory]);

  const handleClear = useCallback(() => {
    setDisplay('0');
    setExpression('');
    setOperator(null);
    setPrevValue(null);
    setWaitingForOperand(false);
    setFullExpression('');
    setJustEvaluated(false);
  }, []);

  const handleBackspace = useCallback(() => {
    if (justEvaluated) {
      handleClear();
      return;
    }
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  }, [display, justEvaluated, handleClear]);

  const handleToggleSign = useCallback(() => {
    if (display === '0' || display === 'Error') return;
    if (display.startsWith('-')) {
      setDisplay(display.slice(1));
    } else {
      setDisplay('-' + display);
    }
  }, [display]);

  const handlePercent = useCallback(() => {
    const num = parseFloat(display);
    if (isNaN(num)) return;
    const result = String(Math.round((num / 100) * 1e10) / 1e10);
    setDisplay(result);
  }, [display]);

  const handleHistoryClick = useCallback((record: HistoryRecord) => {
    setDisplay(record.result);
    setJustEvaluated(true);
    setFullExpression(record.expression + ' =');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  }, []);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === '.') {
        handleDigit('.');
      } else if (e.key === '+') {
        handleOperator('+');
      } else if (e.key === '-') {
        handleOperator('-');
      } else if (e.key === '*') {
        handleOperator('*');
      } else if (e.key === '/') {
        e.preventDefault();
        handleOperator('/');
      } else if (e.key === 'Enter' || e.key === '=') {
        handleEquals();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      } else if (e.key === '%') {
        handlePercent();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleOperator, handleEquals, handleBackspace, handleClear, handlePercent]);

  const toggleHistory = useCallback(() => {
    if (!showHistory) {
      fetchHistory();
    }
    setShowHistory(v => !v);
  }, [showHistory, fetchHistory]);

  const operatorSymbol: Record<CalcOperator, string> = {
    '+': '+',
    '-': '−',
    '*': '×',
    '/': '÷',
  };

  const buttonBase =
    'flex items-center justify-center rounded-2xl text-xl font-semibold cursor-pointer select-none transition-all duration-100 active:scale-95 h-16';

  const numBtn = `${buttonBase} bg-gray-700 hover:bg-gray-600 text-white`;
  const opBtn = `${buttonBase} bg-orange-500 hover:bg-orange-400 text-white`;
  const funcBtn = `${buttonBase} bg-gray-500 hover:bg-gray-400 text-white`;
  const equalsBtn = `${buttonBase} bg-orange-500 hover:bg-orange-400 text-white`;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      {/* Calculator */}
      <div className="w-full bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Display */}
        <div className="px-6 pt-6 pb-4 flex flex-col items-end min-h-[100px]">
          <div className="text-gray-400 text-sm h-5 truncate w-full text-right">
            {fullExpression || '\u00A0'}
          </div>
          <div
            className="text-white font-light mt-1 break-all text-right leading-none"
            style={{
              fontSize: display.length > 12 ? '1.5rem' : display.length > 8 ? '2rem' : '3rem',
            }}
          >
            {formatDisplay(display)}
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-4 gap-3 px-4 pb-6">
          {/* Row 1 */}
          <button className={funcBtn} onClick={handleClear}>C</button>
          <button className={funcBtn} onClick={handleToggleSign}>+/−</button>
          <button className={funcBtn} onClick={handlePercent}>%</button>
          <button className={opBtn} onClick={() => handleOperator('/')}>÷</button>

          {/* Row 2 */}
          <button className={numBtn} onClick={() => handleDigit('7')}>7</button>
          <button className={numBtn} onClick={() => handleDigit('8')}>8</button>
          <button className={numBtn} onClick={() => handleDigit('9')}>9</button>
          <button className={opBtn} onClick={() => handleOperator('*')}>×</button>

          {/* Row 3 */}
          <button className={numBtn} onClick={() => handleDigit('4')}>4</button>
          <button className={numBtn} onClick={() => handleDigit('5')}>5</button>
          <button className={numBtn} onClick={() => handleDigit('6')}>6</button>
          <button className={opBtn} onClick={() => handleOperator('-')}>−</button>

          {/* Row 4 */}
          <button className={numBtn} onClick={() => handleDigit('1')}>1</button>
          <button className={numBtn} onClick={() => handleDigit('2')}>2</button>
          <button className={numBtn} onClick={() => handleDigit('3')}>3</button>
          <button className={opBtn} onClick={() => handleOperator('+')}>+</button>

          {/* Row 5 */}
          <button
            className={`${buttonBase} bg-gray-700 hover:bg-gray-600 text-white col-span-2`}
            onClick={() => handleDigit('0')}
          >
            0
          </button>
          <button className={numBtn} onClick={() => handleDigit('.')}>.</button>
          <button className={equalsBtn} onClick={handleEquals}>=</button>
        </div>

        {/* Backspace row */}
        <div className="px-4 pb-4">
          <button
            className={`${buttonBase} w-full bg-red-800 hover:bg-red-700 text-white`}
            onClick={handleBackspace}
          >
            ⌫ Backspace
          </button>
        </div>
      </div>

      {/* History Toggle */}
      <button
        className="w-full bg-gray-700 hover:bg-gray-600 text-white rounded-2xl py-3 font-semibold transition-colors"
        onClick={toggleHistory}
      >
        {showHistory ? 'Hide History' : 'Show History'}
      </button>

      {/* History Panel */}
      {showHistory && (
        <div className="w-full bg-gray-800 rounded-3xl shadow-xl p-4 max-h-80 overflow-y-auto">
          <h2 className="text-white font-semibold text-lg mb-3 flex items-center justify-between">
            Calculation History
            <button
              className="text-sm text-gray-400 hover:text-white"
              onClick={fetchHistory}
            >
              ↻ Refresh
            </button>
          </h2>
          {historyLoading ? (
            <p className="text-gray-400 text-center py-4">Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No history yet</p>
          ) : (
            <ul className="space-y-2">
              {history.map((record) => (
                <li
                  key={record.id}
                  className="bg-gray-700 rounded-xl px-4 py-3 cursor-pointer hover:bg-gray-600 transition-colors"
                  onClick={() => handleHistoryClick(record)}
                >
                  <div className="text-gray-300 text-sm truncate">{record.expression}</div>
                  <div className="text-white font-semibold text-lg">= {record.result}</div>
                  <div className="text-gray-500 text-xs mt-1">
                    {new Date(record.createdAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
