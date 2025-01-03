/* eslint-disable @typescript-eslint/no-explicit-any */
import portfinder from 'portfinder'
import child_process, { type SpawnOptions } from 'node:child_process'
import fs from 'fs'
import http, { type RequestOptions } from 'node:http'
import pkg from '../../package.json'

export function tryParseInt(text: string, defaultValue: number): number {
  try {
    return parseInt(text)
  } catch (e) {
    return defaultValue
  }
}

export function getConfig(key: string): any {
  return pkg[key]
}

export function getEnvConfigWithDefault(key: string, defaultValue: any = undefined): any {
  return process.env[key] || pkg.env[key] || defaultValue
}

export async function checkPortFree(port: number, host: string): Promise<number> {
  return portfinder
    .getPortPromise({ host: host, port: port, stopPort: port })
    .then((port) => {
      return port
    })
    .catch(() => {
      return -1
    })
}

export async function getPortFree(port: number, host: string): Promise<number> {
  return portfinder
    .getPortPromise({ host: host, port: port })
    .then((port) => {
      return port
    })
    .catch(() => {
      return -1
    })
}

export async function stopProcess(
  pid: any,
  force = false,
  abortController: AbortController
): Promise<boolean> {
  let processCommand = ''
  let forceFlag = ''
  //if windows use powershell to get process
  if (os.isWindows) {
    forceFlag = force ? '-Force' : ''
    processCommand = `powershell -Command "Stop-Process ${forceFlag} -Id ${pid} -ErrorAction SilentlyContinue -PassThru | Select-Object -Property HasExited | ConvertTo-Json"`
  } else {
    forceFlag = force ? '-9' : ''
    processCommand = `kill ${forceFlag} ${pid} 2>/dev/null && echo true || echo false`
  }

  //execute command
  let stopped = false
  await os.runCommandWithCallBack(
    processCommand,
    [],
    { signal: abortController.signal },
    (data) => {
      if (data) {
        const stopOutput = data.trim()
        if (os.isWindows) {
          const stopOutputJson = JSON.parse(data)
          if (stopOutputJson['HasExited']) {
            stopped = true
            return stopped
          }
        } else {
          if (stopOutput === 'true') {
            stopped = true
            return stopped
          }
        }
      }
      return stopped
    }
  )
  return stopped
}

/**
 * find process pid for port, if windows use powershell, if linux use lsof.
 * used to determine if a process using a port is a service or another process
 * @param port to find process pid
 * @param abortController to cancel the process
 * @returns pid using a port
 */
export async function getProcessPidForPort(
  port: number,
  abortController: AbortController
): Promise<string> {
  let processCommand = ''
  //if windows use powershell to get process
  if (os.isWindows) {
    processCommand = `powershell -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -Property OwningProcess | ConvertTo-Json" `
  } else {
    processCommand = `lsof -i :${port} | grep LISTEN | awk '{print $2}'`
  }

  //execute command
  let processPid = ''
  await os.runCommandWithCallBack(
    processCommand,
    [],
    { signal: abortController.signal },
    (data) => {
      if (data) {
        processPid = data.trim()
        if (processPid) {
          if (os.isWindows) {
            let dataJson = JSON.parse(data)
            //if dataJson is array, get first item
            if (Array.isArray(dataJson)) {
              dataJson = dataJson[0]
            }
            //if dataJson has field OwningProcess
            if (dataJson['OwningProcess']) {
              processPid = dataJson['OwningProcess']
              return processPid
            }
          }
        }
        return processPid
      }
      return ''
    }
  )
  return processPid
}

/**
 * find process path for port, if windows use powershell, if linux use lsof.
 * used to determine if a process using a port is a service or another process
 * @param port to find process path
 * @param abortController to cancel the process
 * @returns process path using a port
 */
export async function getProcessPathForPID(
  pid: number,
  abortController: AbortController
): Promise<string> {
  let processCommand = ''
  //if windows use powershell to get process
  if (os.isWindows) {
    processCommand = `powershell -Command "Get-Process -Id ${pid} | Select-Object -Property Path | ConvertTo-Json "`
  } else {
    processCommand = `readlink -f /proc/${pid}/exe`
  }

  //execute command
  //run comm and
  let processPath = ''
  await os.runCommandWithCallBack(
    processCommand,
    [],
    { signal: abortController.signal },
    (data) => {
      if (data) {
        if (os.isWindows) {
          const dataJson = JSON.parse(data)
          if (dataJson['Path']) {
            processPath = dataJson['Path']
            return processPath
          }
        } else {
          processPath = data.trim()
          return processPath
        }
      }
    }
  )

  return processPath
}

export const os = {
  isWindows: process.platform === 'win32',
  isMac: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
  //check if path exists using fs.existsSync
  isPathExist: (path: string): boolean => {
    try {
      return fs.existsSync(path)
    } catch (err) {
      console.error(err)
    }
    return false
  },

  //run a process on os and return when finished
  async runProcess(command: string, args: string[], options: SpawnOptions = {}): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      // set options
      if (options) {
        if (!options.shell) {
          options.shell = true
        }
        if (!options.stdio) {
          options.stdio = ['ignore', 'pipe', 'pipe']
        }
      }
      const child = child_process.spawn(command, args, options)
      if (child.stdout) {
        child.stdout.on('data', (data) => {
          resolve(data.toString())
        })
      }
      if (child.stderr) {
        child.stderr.on('data', (data) => {
          reject(data.toString())
        })
      }
      child.on('error', (err) => {
        reject(err)
      })
      child.on('exit', (code) => {
        if (code !== 0) {
          reject(`Process exited with code ${code}`)
        } else {
          resolve(`Process exited with code ${code}`)
        }
      })
    })
  },

  //run command with call back
  async runCommandWithCallBack(
    command: string,
    args: string[],
    options: SpawnOptions = {},
    callback: (data: string) => void
  ): Promise<string> {
    try {
      const result = await os.runProcess(command, args, options)
      if (callback) {
        callback(result)
        return result
      }
      return result
    } catch (err) {
      return ''
    }
  }
}

export async function getData(options: RequestOptions): Promise<any> {
  return new Promise((resolve, reject) => getHttp(options, resolve, reject))
}

export function getHttp(options: RequestOptions, resolve, reject): void {
  http.get(options, (res) => {
    // on redirect do recursive call
    if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
      const optionsRedirect = Object.assign({}, options)
      optionsRedirect.path = res.headers.location
      return getHttp(optionsRedirect, resolve, reject)
    }

    let rawData = ''

    res.on('data', (chunk: any) => {
      rawData += chunk
    })

    res.on('end', () => {
      try {
        resolve(rawData)
      } catch (err) {
        reject(err)
      }
    })
  })
}

/* parse data as csv unquoted fields  without external libraries */
export function csvParseRow(data: string): string[] {
  let fields: string[] = []
  try {
    fields = data.split(',')
    //for each field remove quotes if present
    for (let i = 0; i < fields.length; i++) {
      let field = fields[i]
      if (field.startsWith('"') && field.endsWith('"')) {
        field = field.substring(1, field.length - 1)
      }
      fields[i] = field
    }
  } catch (error) {
    return []
  }
  return fields
}

/**
 *
 * @param template template string
 * @param args arguments to be replaced in template
 * @returns interpolated string
 */
export function updateTemplateVars(template: string, args: { [key: string]: string }): string {
  if (typeof args !== 'object') {
    return template
  }
  try {
    return new Function('return `' + template.replace(/\$\{(.+?)\}/g, '${this.$1}') + '`;').call(
      args
    )
  } catch (e) {
    // ES6 syntax not supported
  }
  Object.keys(args).forEach((key) => {
    template = template.replace(new RegExp('\\$\\{' + key + '\\}', 'g'), args[key])
  })
  return template
}

/**
 * get string timestamp
 * @returns timestamp
 */
export function timestamp(): string {
  return new Date().toISOString()
}

/*
  compile a templarte string for var
  */
export function varTemplate(name: string): string {
  return '${' + name + '}'
}

export function getCallerName(): string | null {
  const error = new Error()
  if (error) {
    if (error.stack) {
      const stack = error.stack.split('\n')
      // The second item in the stack array is the calling function
      const callerStackLine = stack[2]
      const callerNameMatch = callerStackLine.match(/at (\w+)/)
      if (callerNameMatch) {
        return callerNameMatch[1]
      }
    }
  }
  return null
}

export function getCallStackString(): string {
  const error = new Error()
  if (error && error.stack) {
    const stack = error.stack.split('\n').slice(2) // Slice to remove 'Error' and the call to getCallStack itself
    const functionNames = stack.map((line) => {
      const match = line.match(/at (\w+)/)
      return match ? match[1] : 'anonymous'
    })
    return functionNames.join(' -> ')
  }
  return 'anonymous'
}

export function escapeHTML(unsafe): string {
  return unsafe.replace(
    '/[\u0000-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u00FF]/g',
    (c) => '&#' + ('000' + c.charCodeAt(0)).slice(-4) + ';'
  )
}

export function getTimestamp(date: Date = new Date()): string {
  const timestamp = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .replace(/(.*)T(.*)\..*/, '$1 $2')
  return timestamp
}
