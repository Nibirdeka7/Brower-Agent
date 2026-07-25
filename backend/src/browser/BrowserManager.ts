import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import type { Browser, BrowserContext, Frame, Page, Dialog } from "playwright";
import path from "path"
import fs from "fs"

chromium.use(StealthPlugin())

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
];

const VIEWPORTS = [
    { width: 1920, height: 1000 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 800 }
]

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random()*arr.length)];}

function randInt(min: number, max: number) { return Math.floor(Math.random()*(max-min+1)) + min; }

export interface DialogInfo {
    type: string;
    message: string;
    defaultValue?: string; 
}

export class BrowserManager {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private _page: Page | null = null;
    private _pages: Page[] = [];
    private _activePageIndex = 0;
    private _activeFrame: Frame | null = null;
    private _lastDialog: DialogInfo | null = null;
    private _idleTimer: ReturnType<typeof setInterval> | null = null;

    public lastMouseX = 0;
    public lastMouseY = 0;

    private readonly headless: boolean;
    private readonly slowMo: number;
    private readonly timeout: number;
    private readonly sessionDir: string;
    private readonly sessionName: string;
    private readonly viewport: { width: number; height: number };
    private readonly userAgent: string;

    constructor(){
        this.headless = process.env.HEADLESS !== "false";
        this.slowMo = parseInt(process.env.SLOW_MO ?? "50", 10);
        this.timeout = parseInt(process.env.BROWSER_TIMEOUT ?? "30000", 10);
        this.sessionDir = path.resolve(process.env.SESSION_DIR ?? "./sessions");
        this.sessionName = process.env.SESSION_NAME ?? "default";
        this.viewport = pick(VIEWPORTS);
        this.userAgent = pick(USER_AGENTS); 
    }

    private getSessionPath(): string {
        return path.join(this.sessionDir, `${this.sessionName}.json`);
    }

    async launch(): Promise<void>{
        if(this.browser) return;
        const sessionPath = this.getSessionPath();
        this.browser = await chromium.launch({
            headless: this.headless,
            slowMo: this.slowMo,
            args: [
                // run inside docker/limux
                "--no-sandbox",
                "--disable-setuid-sandbox",
                // force chrome to write temp data to disk storage
                "--disable-dev-shm-usage",
                // stop identified as automated bot
                "--disable-blink-features=AutomationControlled",
                // suppress infobars (info bar such as "Chrome is being controlled by automated test software")
                "--disable-infobars",
                "--disable-extensions",
                "--disable-default-apps",
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-backgrounding-occluded-windows",
                "--disable-renderer-backgrounding",
                `--window-size=${this.viewport.width},${this.viewport.height}`,

            ]
        });

        const contextOptions: Parameters<Browser["newContext"]>[0] = {
            viewport: this.viewport,
            userAgent: this.userAgent,
            locale: "en-US",
            timezoneId: "America/New_York",
            permissions: ["geolocation"],
            geolocation: {latitude: 40.7128, longitude: -74.0060},
            extraHTTPHeaders: {
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
            },
            ignoreHTTPSErrors: false,
        };
        if(fs.existsSync(sessionPath)){
            contextOptions.storageState = sessionPath;
            console.log(`[Browser] loaded session from ${sessionPath}`);
        }
        this.context = await this.browser.newContext(contextOptions);
        this.context.setDefaultTimeout(this.timeout);
        this.context.setDefaultNavigationTimeout(this.timeout);

        await this.context.addInitScript(() => {
            Object.defineProperty(navigator, "webdriver", {get: () => undefined});
            Object.defineProperty(navigator, "plugins", {get: () => [
                { name: "Chrome PDF Plugin" }, {name: "Chrome PDF Viewer"}, {name: "Native Client"},
            ],});
            
            Object.defineProperty(navigator, "languages", {get: () => ["en-US", "en"]});

            const vw = (window as unknown as { _vw?: number })._vw || screen.availWidth || 1920;
            const vh = (window as unknown as { _vh?: number })._vh || screen.availHeight || 1080;

            Object.defineProperty(screen, "width", {get: () => vw});
            Object.defineProperty(screen, "height", {get: () => vh});
            Object.defineProperty(screen, "availWidth", {get: () => vw});
            Object.defineProperty(screen, "availHeight", {get: () => vh});

            Object.defineProperty(window, "outerWidth", {get: () => vw});
            Object.defineProperty(window, "outerHeight", {get: () => vh});
            Object.defineProperty(window, "innerWidth", {get: () => vw});
            Object.defineProperty(window, "innerHeight", {get: () => vh});

            (window as unknown as Record<string, unknown>).chrome = {
                runtime: {}, loadTimes: () => ({}), csi: () => ({}), app: {},
            }

            // permissions
            const origQuery = window.navigator.permissions?.query;
            if(origQuery){
                window.navigator.permissions.query = (p: PermissionDescriptor) => 
                    p.name === "notifications"
                        ? Promise.resolve({ state: "denied" } as PermissionStatus)
                        : origQuery.call(navigator.permissions, p);
            }

            const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
            CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h){
                const d = origGetImageData.call(this, x, y, w, h);
                for(let i = 0; i < d.data.length; i += 100){
                    d.data[i] = d.data[i]^1; // 1 bit noise inperceptible
                }
                return d;
            };     
        })
        this._page = await this.context.newPage();
        this._pages = [this._page];

        await this._page.route("**/*", async (route) => {
            const headers = { ...route.request().headers() };
            delete headers["x-playwright"];
            delete headers["x-puppeteer"];
            await route.continue({ headers });
        });

        this._page.on("dialog", async (dialog: Dialog) => {
            this._lastDialog = {
                type: dialog.type(),
                message: dialog.message(),
                defaultValue: dialog.defaultValue(),
            };
            console.log(`[Browser] Dialog: ${dialog.type()} - "${dialog.message()}"`);
            await dialog.accept();
        })

        // Handles -> new tab / pop up 
        this.context.on("page", async(newPage: Page) => {
            console.log(`[Browser] new tab opened: ${newPage.url()}`);
            this._pages.push(newPage);
            newPage.on("dialog", async (dialog: Dialog) => {
                this._lastDialog = { type: dialog.type(), message: dialog.message() };
                await dialog.accept();
            })
            await newPage.route("**/*", async (route) => {
                const headers = { ...route.request().headers() };
                delete headers["x-playwright"];
                await route.continue({ headers });
            })
        })
         // randomly move mouse in headless mode to avoid bot detection
        if(this.headless){
            this._idleTimer = setInterval(async() => {
                if(!this._page) return;
                const x = randInt(200, this.viewport.width - 200);
                const y = randInt(200, this.viewport.height - 100);
                try {
                    await this._page.mouse.move(x, y, { steps: randInt(3, 8) });
                    this.lastMouseX = x;
                    this.lastMouseY = y;
                } catch (error) {
                    
                }
            }, randInt(8000, 20000));
        }
        console.log(`[Browser] launched (headless=${this.headless}, ${this.viewport.width}*${this.viewport.height})`)
    }

    getPage(): Page {
        if(!this._page) throw new Error("Browser not launched");
        return this._pages[this._activePageIndex] ?? this._page;
    }

    getFrame(): Frame | Page {
        return this._activeFrame ?? this.getPage();
    }

    getContext(): BrowserContext{
        if(!this.context) throw new Error("Browser context not available");
        return this.context;
    }
    getAllPages(): Page[] { return [...this._pages]; }
    getActivePageIndex(): number { return this._activePageIndex; }
    
    getLastDialog(): DialogInfo | null {
        return this._lastDialog
    }

    async switchToFrame(selectorOrUrl: string): Promise<boolean> {
        const page = this.getPage();
        const handle = await page.$(selectorOrUrl).catch(() => null);
        if(handle){
            const frame = await handle.contentFrame();
            if(frame){
                this._activeFrame = frame;
                if(frame){
                    this._activeFrame = frame;
                    console.log(`[Browser] switched to iframe: ${selectorOrUrl}`);
                    return true;
                }
            }

        }
        const frame = page.frames().find(f => f.url().includes(selectorOrUrl));
        if(frame){
            this._activeFrame = frame;
            console.log(`[Browser] switched to iframe: ${selectorOrUrl}`);
            return true;
        }
        return false;
    }
    switchToMainFrame() : void {
        this._activeFrame = null;
        console.log("[Browser] Switched back to main frame")
    }

    async switchToTab(index: number): Promise<boolean>{
        if(index < 0 || index >= this._pages.length) return false;
        this._activePageIndex = index;
        this._activeFrame = null;
        try {
            await this._pages[index].bringToFront();
        } catch (error) {
            
        }
        console.log(`[Browser] Switched to tab ${index}: ${this._pages[index].url()}`);
        return true;
    }

    isLaunched(): boolean {
        return this.browser !== null;
    }

    async close(): Promise<void> {
        if(this._idleTimer) clearInterval(this._idleTimer);
        for(const p of this._pages) { try { await p.close() } catch (error) {}}
        await this.context?.close();
        await this.browser?.close();
        this._page = null;
        this._pages = [];
        this.context = null;
        this.browser = null;
        console.log("[Browser] Closed")
        
    }
}

export const browserManager = new BrowserManager()