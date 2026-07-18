// src/lib/codeWorkers.ts

export const createPythonWorker = () => {
  const workerCode = `
    importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");

    let pyodideReadyPromise = loadPyodide();

    self.onmessage = async (e) => {
      const { code, input, id } = e.data;
      
      try {
        let pyodide = await pyodideReadyPromise;
        
        // Mock input() and redirect stdout/stderr
        let inputIdx = 0;
        const inputs = input ? input.trim().split("\\n") : [];
        pyodide.globals.set("custom_input_worker", () => {
          if (inputIdx < inputs.length) return inputs[inputIdx++];
          return "";
        });
        
        await pyodide.runPythonAsync(\`
import sys
import io
import builtins

sys.stdout = io.StringIO()
sys.stderr = io.StringIO()

def mock_input(prompt=""):
    return custom_input_worker()
builtins.input = mock_input
        \`);
        
        // Run user code
        await pyodide.runPythonAsync(code);
        
        // Retrieve output
        const stdout = pyodide.runPython("sys.stdout.getvalue()");
        const stderr = pyodide.runPython("sys.stderr.getvalue()");
        
        self.postMessage({ id, stdout, stderr, error: null });
      } catch (err) {
        const errorMsg = err.toString();
        self.postMessage({ id, stdout: "", stderr: errorMsg, error: errorMsg });
      }
    };
  `;
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};

export const createJSWorker = () => {
  const workerCode = `
    self.onmessage = async (e) => {
      const { code, input, id } = e.data;
      
      try {
        let stdout = "";
        const originalLog = console.log;
        const originalError = console.error;
        
        console.log = (...args) => {
          stdout += args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" ") + "\\n";
        };
        console.error = (...args) => {
          stdout += args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" ") + "\\n";
        };
        
        // Mock prompt() for JS input
        let inputIdx = 0;
        const inputs = input ? input.trim().split("\\n") : [];
        const customPrompt = () => {
          if (inputIdx < inputs.length) return inputs[inputIdx++];
          return "";
        };
        
        // Execute code
        const func = new Function("prompt", "console", code);
        func(customPrompt, console);
        
        console.log = originalLog;
        console.error = originalError;
        self.postMessage({ id, stdout, stderr: "", error: null });
      } catch (err) {
        self.postMessage({ id, stdout: "", stderr: err.toString(), error: err.toString() });
      }
    };
  `;
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};

export const executeInWorker = (worker: Worker, code: string, input: string, timeLimitMs: number): Promise<{ stdout: string, stderr: string, error?: string }> => {
  return new Promise((resolve) => {
    const id = Math.random().toString(36).substring(7);
    
    let timeout = setTimeout(() => {
      worker.terminate();
      resolve({ stdout: "", stderr: "", error: "Time Limit Exceeded - Possible Infinite Loop" });
    }, timeLimitMs);

    worker.onmessage = (e) => {
      if (e.data.id === id) {
        clearTimeout(timeout);
        resolve({ stdout: e.data.stdout, stderr: e.data.stderr, error: e.data.error });
      }
    };
    
    worker.postMessage({ id, code, input });
  });
};
