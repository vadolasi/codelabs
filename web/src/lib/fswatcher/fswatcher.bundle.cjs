var Dt = Object.create
var X = Object.defineProperty
var It = Object.getOwnPropertyDescriptor
var Tt = Object.getOwnPropertyNames
var vt = Object.getPrototypeOf,
	xt = Object.prototype.hasOwnProperty
var Ft = (i, t, e, r) => {
	if ((t && typeof t == "object") || typeof t == "function")
		for (const s of Tt(t))
			!xt.call(i, s) &&
				s !== e &&
				X(i, s, {
					get: () => t[s],
					enumerable: !(r = It(t, s)) || r.enumerable
				})
	return i
}
var j = (i, t, e) => (
	(e = i != null ? Dt(vt(i)) : {}),
	Ft(
		t || !i || !i.__esModule
			? X(e, "default", { value: i, enumerable: !0 })
			: e,
		i
	)
)
var _t = require("node:events"),
	pt = require("node:fs"),
	z = require("node:fs/promises"),
	f = j(require("node:path"), 1)
var R = require("node:fs/promises"),
	b = require("node:path"),
	st = require("node:stream"),
	E = {
		FILE_TYPE: "files",
		DIR_TYPE: "directories",
		FILE_DIR_TYPE: "files_directories",
		EVERYTHING_TYPE: "all"
	},
	Y = {
		root: ".",
		fileFilter: (i) => !0,
		directoryFilter: (i) => !0,
		type: E.FILE_TYPE,
		lstat: !1,
		depth: 2147483648,
		alwaysStat: !1,
		highWaterMark: 4096
	}
Object.freeze(Y)
var it = "READDIRP_RECURSIVE_ERROR",
	St = new Set(["ENOENT", "EPERM", "EACCES", "ELOOP", it]),
	Z = [E.DIR_TYPE, E.EVERYTHING_TYPE, E.FILE_DIR_TYPE, E.FILE_TYPE],
	At = new Set([E.DIR_TYPE, E.EVERYTHING_TYPE, E.FILE_DIR_TYPE]),
	Wt = new Set([E.EVERYTHING_TYPE, E.FILE_DIR_TYPE, E.FILE_TYPE]),
	Nt = (i) => St.has(i.code),
	kt = process.platform === "win32",
	tt = (i) => !0,
	et = (i) => {
		if (i === void 0) return tt
		if (typeof i == "function") return i
		if (typeof i == "string") {
			const t = i.trim()
			return (e) => e.basename === t
		}
		if (Array.isArray(i)) {
			const t = i.map((e) => e.trim())
			return (e) => t.some((r) => e.basename === r)
		}
		return tt
	},
	U = class extends st.Readable {
		parents
		reading
		parent
		_stat
		_maxDepth
		_wantsDir
		_wantsFile
		_wantsEverything
		_root
		_isDirent
		_statsProp
		_rdOptions
		_fileFilter
		_directoryFilter
		constructor(t = {}) {
			super({ objectMode: !0, autoDestroy: !0, highWaterMark: t.highWaterMark })
			const e = { ...Y, ...t },
				{ root: r, type: s } = e
			;(this._fileFilter = et(e.fileFilter)),
				(this._directoryFilter = et(e.directoryFilter))
			const n = e.lstat ? R.lstat : R.stat
			kt ? (this._stat = (h) => n(h, { bigint: !0 })) : (this._stat = n),
				(this._maxDepth =
					e.depth != null && Number.isSafeInteger(e.depth) ? e.depth : Y.depth),
				(this._wantsDir = s ? At.has(s) : !1),
				(this._wantsFile = s ? Wt.has(s) : !1),
				(this._wantsEverything = s === E.EVERYTHING_TYPE),
				(this._root = (0, b.resolve)(r)),
				(this._isDirent = !e.alwaysStat),
				(this._statsProp = this._isDirent ? "dirent" : "stats"),
				(this._rdOptions = { encoding: "utf8", withFileTypes: this._isDirent }),
				(this.parents = [this._exploreDir(r, 1)]),
				(this.reading = !1),
				(this.parent = void 0)
		}
		async _read(t) {
			if (!this.reading) {
				this.reading = !0
				try {
					while (!this.destroyed && t > 0) {
						const e = this.parent,
							r = e && e.files
						if (r && r.length > 0) {
							const { path: s, depth: n } = e,
								h = r.splice(0, t).map((a) => this._formatEntry(a, s)),
								o = await Promise.all(h)
							for (const a of o) {
								if (!a) continue
								if (this.destroyed) return
								const c = await this._getEntryType(a)
								c === "directory" && this._directoryFilter(a)
									? (n <= this._maxDepth &&
											this.parents.push(this._exploreDir(a.fullPath, n + 1)),
										this._wantsDir && (this.push(a), t--))
									: (c === "file" || this._includeAsFile(a)) &&
										this._fileFilter(a) &&
										this._wantsFile &&
										(this.push(a), t--)
							}
						} else {
							const s = this.parents.pop()
							if (!s) {
								this.push(null)
								break
							}
							if (((this.parent = await s), this.destroyed)) return
						}
					}
				} catch (e) {
					this.destroy(e)
				} finally {
					this.reading = !1
				}
			}
		}
		async _exploreDir(t, e) {
			let r
			try {
				r = await (0, R.readdir)(t, this._rdOptions)
			} catch (s) {
				this._onError(s)
			}
			return { files: r, depth: e, path: t }
		}
		async _formatEntry(t, e) {
			let r,
				s = this._isDirent ? t.name : t
			try {
				const n = (0, b.resolve)((0, b.join)(e, s))
				;(r = {
					path: (0, b.relative)(this._root, n),
					fullPath: n,
					basename: s
				}),
					(r[this._statsProp] = this._isDirent ? t : await this._stat(n))
			} catch (n) {
				this._onError(n)
				return
			}
			return r
		}
		_onError(t) {
			Nt(t) && !this.destroyed ? this.emit("warn", t) : this.destroy(t)
		}
		async _getEntryType(t) {
			if (!t && this._statsProp in t) return ""
			const e = t[this._statsProp]
			if (e.isFile()) return "file"
			if (e.isDirectory()) return "directory"
			if (e && e.isSymbolicLink()) {
				const r = t.fullPath
				try {
					const s = await (0, R.realpath)(r),
						n = await (0, R.lstat)(s)
					if (n.isFile()) return "file"
					if (n.isDirectory()) {
						const h = s.length
						if (r.startsWith(s) && r.substr(h, 1) === b.sep) {
							const o = new Error(
								`Circular symlink detected: "${r}" points to "${s}"`
							)
							return (o.code = it), this._onError(o)
						}
						return "directory"
					}
				} catch (s) {
					return this._onError(s), ""
				}
			}
		}
		_includeAsFile(t) {
			const e = t && t[this._statsProp]
			return e && this._wantsEverything && !e.isDirectory()
		}
	}
function rt(i, t = {}) {
	let e = t.entryType || t.type
	if ((e === "both" && (e = E.FILE_DIR_TYPE), e && (t.type = e), i)) {
		if (typeof i != "string")
			throw new TypeError(
				"readdirp: root argument must be a string. Usage: readdirp(root, options)"
			)
		if (e && !Z.includes(e))
			throw new Error(
				`readdirp: Invalid type passed. Use one of ${Z.join(", ")}`
			)
	} else
		throw new Error(
			"readdirp: root argument is required. Usage: readdirp(root, options)"
		)
	return (t.root = i), new U(t)
}
var I = require("node:fs"),
	y = require("node:fs/promises"),
	ot = require("node:os"),
	_ = j(require("node:path"), 1),
	Lt = "data",
	V = "end",
	at = "close",
	L = () => {}
var C = process.platform,
	$ = C === "win32",
	Ct = C === "darwin",
	Ot = C === "linux",
	Mt = C === "freebsd",
	ht = (0, ot.type)() === "OS400",
	p = {
		ALL: "all",
		READY: "ready",
		ADD: "add",
		CHANGE: "change",
		ADD_DIR: "addDir",
		UNLINK: "unlink",
		UNLINK_DIR: "unlinkDir",
		RAW: "raw",
		ERROR: "error"
	},
	g = p,
	zt = "watch",
	Ht = { lstat: y.lstat, stat: y.stat },
	D = "listeners",
	A = "errHandlers",
	T = "rawEmitters",
	jt = [D, A, T],
	Yt = new Set([
		"3dm",
		"3ds",
		"3g2",
		"3gp",
		"7z",
		"a",
		"aac",
		"adp",
		"afdesign",
		"afphoto",
		"afpub",
		"ai",
		"aif",
		"aiff",
		"alz",
		"ape",
		"apk",
		"appimage",
		"ar",
		"arj",
		"asf",
		"au",
		"avi",
		"bak",
		"baml",
		"bh",
		"bin",
		"bk",
		"bmp",
		"btif",
		"bz2",
		"bzip2",
		"cab",
		"caf",
		"cgm",
		"class",
		"cmx",
		"cpio",
		"cr2",
		"cur",
		"dat",
		"dcm",
		"deb",
		"dex",
		"djvu",
		"dll",
		"dmg",
		"dng",
		"doc",
		"docm",
		"docx",
		"dot",
		"dotm",
		"dra",
		"DS_Store",
		"dsk",
		"dts",
		"dtshd",
		"dvb",
		"dwg",
		"dxf",
		"ecelp4800",
		"ecelp7470",
		"ecelp9600",
		"egg",
		"eol",
		"eot",
		"epub",
		"exe",
		"f4v",
		"fbs",
		"fh",
		"fla",
		"flac",
		"flatpak",
		"fli",
		"flv",
		"fpx",
		"fst",
		"fvt",
		"g3",
		"gh",
		"gif",
		"graffle",
		"gz",
		"gzip",
		"h261",
		"h263",
		"h264",
		"icns",
		"ico",
		"ief",
		"img",
		"ipa",
		"iso",
		"jar",
		"jpeg",
		"jpg",
		"jpgv",
		"jpm",
		"jxr",
		"key",
		"ktx",
		"lha",
		"lib",
		"lvp",
		"lz",
		"lzh",
		"lzma",
		"lzo",
		"m3u",
		"m4a",
		"m4v",
		"mar",
		"mdi",
		"mht",
		"mid",
		"midi",
		"mj2",
		"mka",
		"mkv",
		"mmr",
		"mng",
		"mobi",
		"mov",
		"movie",
		"mp3",
		"mp4",
		"mp4a",
		"mpeg",
		"mpg",
		"mpga",
		"mxu",
		"nef",
		"npx",
		"numbers",
		"nupkg",
		"o",
		"odp",
		"ods",
		"odt",
		"oga",
		"ogg",
		"ogv",
		"otf",
		"ott",
		"pages",
		"pbm",
		"pcx",
		"pdb",
		"pdf",
		"pea",
		"pgm",
		"pic",
		"png",
		"pnm",
		"pot",
		"potm",
		"potx",
		"ppa",
		"ppam",
		"ppm",
		"pps",
		"ppsm",
		"ppsx",
		"ppt",
		"pptm",
		"pptx",
		"psd",
		"pya",
		"pyc",
		"pyo",
		"pyv",
		"qt",
		"rar",
		"ras",
		"raw",
		"resources",
		"rgb",
		"rip",
		"rlc",
		"rmf",
		"rmvb",
		"rpm",
		"rtf",
		"rz",
		"s3m",
		"s7z",
		"scpt",
		"sgi",
		"shar",
		"snap",
		"sil",
		"sketch",
		"slk",
		"smv",
		"snk",
		"so",
		"stl",
		"suo",
		"sub",
		"swf",
		"tar",
		"tbz",
		"tbz2",
		"tga",
		"tgz",
		"thmx",
		"tif",
		"tiff",
		"tlz",
		"ttc",
		"ttf",
		"txz",
		"udf",
		"uvh",
		"uvi",
		"uvm",
		"uvp",
		"uvs",
		"uvu",
		"viv",
		"vob",
		"war",
		"wav",
		"wax",
		"wbmp",
		"wdp",
		"weba",
		"webm",
		"webp",
		"whl",
		"wim",
		"wm",
		"wma",
		"wmv",
		"wmx",
		"woff",
		"woff2",
		"wrm",
		"wvx",
		"xbm",
		"xif",
		"xla",
		"xlam",
		"xls",
		"xlsb",
		"xlsm",
		"xlsx",
		"xlt",
		"xltm",
		"xltx",
		"xm",
		"xmind",
		"xpi",
		"xpm",
		"xwd",
		"xz",
		"z",
		"zip",
		"zipx"
	]),
	Ut = (i) => Yt.has(_.extname(i).slice(1).toLowerCase()),
	K = (i, t) => {
		i instanceof Set ? i.forEach(t) : t(i)
	},
	F = (i, t, e) => {
		let r = i[t]
		r instanceof Set || (i[t] = r = new Set([r])), r.add(e)
	},
	Gt = (i) => (t) => {
		const e = i[t]
		e instanceof Set ? e.clear() : delete i[t]
	},
	S = (i, t, e) => {
		const r = i[t]
		r instanceof Set ? r.delete(e) : r === e && delete i[t]
	},
	ct = (i) => (i instanceof Set ? i.size === 0 : !i),
	W = new Map()
function nt(i, t, e, r, s) {
	const n = (h, o) => {
		e(i),
			s(h, o, { watchedPath: i }),
			o && i !== o && N(_.resolve(i, o), D, _.join(i, o))
	}
	try {
		return (0, I.watch)(i, { persistent: t.persistent }, n)
	} catch (h) {
		r(h)
		return
	}
}
var N = (i, t, e, r, s) => {
		const n = W.get(i)
		n &&
			K(n[t], (h) => {
				h(e, r, s)
			})
	},
	Kt = (i, t, e, r) => {
		let { listener: s, errHandler: n, rawEmitter: h } = r,
			o = W.get(t),
			a
		if (!e.persistent)
			return (a = nt(i, e, s, n, h)), a ? a.close.bind(a) : void 0
		if (o) F(o, D, s), F(o, A, n), F(o, T, h)
		else {
			if (((a = nt(i, e, N.bind(null, t, D), n, N.bind(null, t, T))), !a))
				return
			a.on(g.ERROR, async (c) => {
				const l = N.bind(null, t, A)
				if ((o && (o.watcherUnusable = !0), $ && c.code === "EPERM"))
					try {
						await (await (0, y.open)(i, "r")).close(), l(c)
					} catch {}
				else l(c)
			}),
				(o = { listeners: s, errHandlers: n, rawEmitters: h, watcher: a }),
				W.set(t, o)
		}
		return () => {
			S(o, D, s),
				S(o, A, n),
				S(o, T, h),
				ct(o.listeners) &&
					(o.watcher.close(),
					W.delete(t),
					jt.forEach(Gt(o)),
					(o.watcher = void 0),
					Object.freeze(o))
		}
	},
	G = new Map(),
	Vt = (i, t, e, r) => {
		let { listener: s, rawEmitter: n } = r,
			h = G.get(t),
			o = h && h.options
		return (
			o &&
				(o.persistent < e.persistent || o.interval > e.interval) &&
				((0, I.unwatchFile)(t), (h = void 0)),
			h
				? (F(h, D, s), F(h, T, n))
				: ((h = {
						listeners: s,
						rawEmitters: n,
						options: e,
						watcher: (0, I.watchFile)(t, e, (a, c) => {
							K(h.rawEmitters, (u) => {
								u(g.CHANGE, t, { curr: a, prev: c })
							})
							const l = a.mtimeMs
							;(a.size !== c.size || l > c.mtimeMs || l === 0) &&
								K(h.listeners, (u) => u(i, a))
						})
					}),
					G.set(t, h)),
			() => {
				S(h, D, s),
					S(h, T, n),
					ct(h.listeners) &&
						(G.delete(t),
						(0, I.unwatchFile)(t),
						(h.options = h.watcher = void 0),
						Object.freeze(h))
			}
		)
	},
	k = class {
		fsw
		_boundHandleError
		constructor(t) {
			;(this.fsw = t), (this._boundHandleError = (e) => t._handleError(e))
		}
		_watchWithNodeFs(t, e) {
			const r = this.fsw.options,
				s = _.dirname(t),
				n = _.basename(t)
			this.fsw._getWatchedDir(s).add(n)
			const o = _.resolve(t),
				a = { persistent: r.persistent }
			e || (e = L)
			let c
			if (r.usePolling) {
				const l = r.interval !== r.binaryInterval
				;(a.interval = l && Ut(n) ? r.binaryInterval : r.interval),
					(c = Vt(t, o, a, { listener: e, rawEmitter: this.fsw._emitRaw }))
			} else
				c = Kt(t, o, a, {
					listener: e,
					errHandler: this._boundHandleError,
					rawEmitter: this.fsw._emitRaw
				})
			return c
		}
		_handleFile(t, e, r) {
			if (this.fsw.closed) return
			let s = _.dirname(t),
				n = _.basename(t),
				h = this.fsw._getWatchedDir(s),
				o = e
			if (h.has(n)) return
			const a = async (l, u) => {
					if (this.fsw._throttle(zt, t, 5)) {
						if (!u || u.mtimeMs === 0)
							try {
								const d = await (0, y.stat)(t)
								if (this.fsw.closed) return
								const m = d.atimeMs,
									w = d.mtimeMs
								if (
									((!m || m <= w || w !== o.mtimeMs) &&
										this.fsw._emit(g.CHANGE, t, d),
									(Ct || Ot || Mt) && o.ino !== d.ino)
								) {
									this.fsw._closeFile(l), (o = d)
									const P = this._watchWithNodeFs(t, a)
									P && this.fsw._addPathCloser(l, P)
								} else o = d
							} catch {
								this.fsw._remove(s, n)
							}
						else if (h.has(n)) {
							const d = u.atimeMs,
								m = u.mtimeMs
							;(!d || d <= m || m !== o.mtimeMs) &&
								this.fsw._emit(g.CHANGE, t, u),
								(o = u)
						}
					}
				},
				c = this._watchWithNodeFs(t, a)
			if (!(r && this.fsw.options.ignoreInitial) && this.fsw._isntIgnored(t)) {
				if (!this.fsw._throttle(g.ADD, t, 0)) return
				this.fsw._emit(g.ADD, t, e)
			}
			return c
		}
		async _handleSymlink(t, e, r, s) {
			if (this.fsw.closed) return
			const n = t.fullPath,
				h = this.fsw._getWatchedDir(e)
			if (!this.fsw.options.followSymlinks) {
				this.fsw._incrReadyCount()
				let o
				try {
					o = await (0, y.realpath)(r)
				} catch {
					return this.fsw._emitReady(), !0
				}
				return this.fsw.closed
					? void 0
					: (h.has(s)
							? this.fsw._symlinkPaths.get(n) !== o &&
								(this.fsw._symlinkPaths.set(n, o),
								this.fsw._emit(g.CHANGE, r, t.stats))
							: (h.add(s),
								this.fsw._symlinkPaths.set(n, o),
								this.fsw._emit(g.ADD, r, t.stats)),
						this.fsw._emitReady(),
						!0)
			}
			if (this.fsw._symlinkPaths.has(n)) return !0
			this.fsw._symlinkPaths.set(n, !0)
		}
		_handleRead(t, e, r, s, n, h, o) {
			t = _.join(t, "")
			const a = s ? `${t}:${s}` : t
			if (((o = this.fsw._throttle("readdir", a, 1e3)), !o)) return
			let c = this.fsw._getWatchedDir(r.path),
				l = new Set(),
				u = this.fsw._readdirp(t, {
					fileFilter: (d) => r.filterPath(d),
					directoryFilter: (d) => r.filterDir(d)
				})
			if (u)
				return (
					u
						.on(Lt, async (d) => {
							if (this.fsw.closed) {
								u = void 0
								return
							}
							let m = d.path,
								w = _.join(t, m)
							if (
								(l.add(m),
								!(
									d.stats.isSymbolicLink() &&
									(await this._handleSymlink(d, t, w, m))
								))
							) {
								if (this.fsw.closed) {
									u = void 0
									return
								}
								;(m === s || (!s && !c.has(m))) &&
									(this.fsw._incrReadyCount(),
									(w = _.join(n, _.relative(n, w))),
									this._addToNodeFs(w, e, r, h + 1))
							}
						})
						.on(g.ERROR, this._boundHandleError),
					new Promise((d, m) => {
						if (!u) return m()
						u.once(V, () => {
							if (this.fsw.closed) {
								u = void 0
								return
							}
							const w = o ? o.clear() : !1
							d(void 0),
								c
									.getChildren()
									.filter((P) => P !== t && !l.has(P))
									.forEach((P) => {
										this.fsw._remove(t, P)
									}),
								(u = void 0),
								w && this._handleRead(t, !1, r, s, n, h, o)
						})
					})
				)
		}
		async _handleDir(t, e, r, s, n, h, o) {
			const a = this.fsw._getWatchedDir(_.dirname(t)),
				c = a.has(_.basename(t))
			!(r && this.fsw.options.ignoreInitial) &&
				!n &&
				!c &&
				this.fsw._emit(g.ADD_DIR, t, e),
				a.add(_.basename(t)),
				this.fsw._getWatchedDir(t)
			let l,
				u,
				d = this.fsw.options.depth
			if ((d == null || s <= d) && !this.fsw._symlinkPaths.has(o)) {
				if (
					!n &&
					(await this._handleRead(t, r, h, n, t, s, l), this.fsw.closed)
				)
					return
				u = this._watchWithNodeFs(t, (m, w) => {
					;(w && w.mtimeMs === 0) || this._handleRead(m, !1, h, n, t, s, l)
				})
			}
			return u
		}
		async _addToNodeFs(t, e, r, s, n) {
			const h = this.fsw._emitReady
			if (this.fsw._isIgnored(t) || this.fsw.closed) return h(), !1
			const o = this.fsw._getWatchHelpers(t)
			r &&
				((o.filterPath = (a) => r.filterPath(a)),
				(o.filterDir = (a) => r.filterDir(a)))
			try {
				const a = await Ht[o.statMethod](o.watchPath)
				if (this.fsw.closed) return
				if (this.fsw._isIgnored(o.watchPath, a)) return h(), !1
				let c = this.fsw.options.followSymlinks,
					l
				if (a.isDirectory()) {
					const u = _.resolve(t),
						d = c ? await (0, y.realpath)(t) : t
					if (
						this.fsw.closed ||
						((l = await this._handleDir(o.watchPath, a, e, s, n, o, d)),
						this.fsw.closed)
					)
						return
					u !== d && d !== void 0 && this.fsw._symlinkPaths.set(u, d)
				} else if (a.isSymbolicLink()) {
					const u = c ? await (0, y.realpath)(t) : t
					if (this.fsw.closed) return
					const d = _.dirname(o.watchPath)
					if (
						(this.fsw._getWatchedDir(d).add(o.watchPath),
						this.fsw._emit(g.ADD, o.watchPath, a),
						(l = await this._handleDir(d, a, e, s, t, o, u)),
						this.fsw.closed)
					)
						return
					u !== void 0 && this.fsw._symlinkPaths.set(_.resolve(t), u)
				} else l = this._handleFile(o.watchPath, a, e)
				return h(), l && this.fsw._addPathCloser(t, l), !1
			} catch (a) {
				if (this.fsw._handleError(a)) return h(), t
			}
		}
	}
var B = "/",
	$t = "//",
	mt = ".",
	Bt = "..",
	qt = "string",
	Jt = /\\/g,
	wt = /\/\//g,
	Qt = /\..*\.(sw[px])$|~$|\.subl.*\.tmp/,
	Xt = /^\.[/\\]/
function O(i) {
	return Array.isArray(i) ? i : [i]
}
var q = (i) => typeof i == "object" && i !== null && !(i instanceof RegExp)
function Zt(i) {
	return typeof i == "function"
		? i
		: typeof i == "string"
			? (t) => i === t
			: i instanceof RegExp
				? (t) => i.test(t)
				: typeof i == "object" && i !== null
					? (t) => {
							if (i.path === t) return !0
							if (i.recursive) {
								const e = f.relative(i.path, t)
								return e ? !e.startsWith("..") && !f.isAbsolute(e) : !1
							}
							return !1
						}
					: () => !1
}
function te(i) {
	if (typeof i != "string") throw new Error("string expected")
	;(i = f.normalize(i)), (i = i.replace(/\\/g, "/"))
	let t = !1
	return (
		i.startsWith("//") && (t = !0),
		(i = i.replace(wt, "/")),
		t && (i = "/" + i),
		i
	)
}
function lt(i, t, e) {
	const r = te(t)
	for (let s = 0; s < i.length; s++) {
		const n = i[s]
		if (n(r, e)) return !0
	}
	return !1
}
function ee(i, t) {
	if (i == null) throw new TypeError("anymatch: specify first argument")
	const r = O(i).map((s) => Zt(s))
	return t == null ? (s, n) => lt(r, s, n) : lt(r, t)
}
var dt = (i) => {
		const t = O(i).flat()
		if (!t.every((e) => typeof e === qt))
			throw new TypeError(`Non-string provided as watch path: ${t}`)
		return t.map(Et)
	},
	ft = (i) => {
		let t = i.replace(Jt, B),
			e = !1
		return (
			t.startsWith($t) && (e = !0), (t = t.replace(wt, B)), e && (t = B + t), t
		)
	},
	Et = (i) => ft(f.normalize(ft(i))),
	ut =
		(i = "") =>
		(t) =>
			typeof t == "string" ? Et(f.isAbsolute(t) ? t : f.join(i, t)) : t,
	se = (i, t) => (f.isAbsolute(i) ? i : f.join(t, i)),
	ie = Object.freeze(new Set()),
	J = class {
		path
		_removeWatcher
		items
		constructor(t, e) {
			;(this.path = t), (this._removeWatcher = e), (this.items = new Set())
		}
		add(t) {
			const { items: e } = this
			e && t !== mt && t !== Bt && e.add(t)
		}
		async remove(t) {
			const { items: e } = this
			if (!e || (e.delete(t), e.size > 0)) return
			const r = this.path
			try {
				await (0, z.readdir)(r)
			} catch {
				this._removeWatcher && this._removeWatcher(f.dirname(r), f.basename(r))
			}
		}
		has(t) {
			const { items: e } = this
			if (e) return e.has(t)
		}
		getChildren() {
			const { items: t } = this
			return t ? [...t.values()] : []
		}
		dispose() {
			this.items.clear(),
				(this.path = ""),
				(this._removeWatcher = L),
				(this.items = ie),
				Object.freeze(this)
		}
	},
	re = "stat",
	ne = "lstat",
	Q = class {
		fsw
		path
		watchPath
		fullWatchPath
		dirParts
		followSymlinks
		statMethod
		constructor(t, e, r) {
			this.fsw = r
			const s = t
			;(this.path = t = t.replace(Xt, "")),
				(this.watchPath = s),
				(this.fullWatchPath = f.resolve(s)),
				(this.dirParts = []),
				this.dirParts.forEach((n) => {
					n.length > 1 && n.pop()
				}),
				(this.followSymlinks = e),
				(this.statMethod = e ? re : ne)
		}
		entryPath(t) {
			return f.join(this.watchPath, f.relative(this.watchPath, t.fullPath))
		}
		filterPath(t) {
			const { stats: e } = t
			if (e && e.isSymbolicLink()) return this.filterDir(t)
			const r = this.entryPath(t)
			return this.fsw._isntIgnored(r, e) && this.fsw._hasReadPermissions(e)
		}
		filterDir(t) {
			return this.fsw._isntIgnored(this.entryPath(t), t.stats)
		}
	},
	M = class extends _t.EventEmitter {
		closed
		options
		_closers
		_ignoredPaths
		_throttled
		_streams
		_symlinkPaths
		_watched
		_pendingWrites
		_pendingUnlinks
		_readyCount
		_emitReady
		_closePromise
		_userIgnored
		_readyEmitted
		_emitRaw
		_boundRemove
		_nodeFsHandler
		constructor(t = {}) {
			super(),
				(this.closed = !1),
				(this._closers = new Map()),
				(this._ignoredPaths = new Set()),
				(this._throttled = new Map()),
				(this._streams = new Set()),
				(this._symlinkPaths = new Map()),
				(this._watched = new Map()),
				(this._pendingWrites = new Map()),
				(this._pendingUnlinks = new Map()),
				(this._readyCount = 0),
				(this._readyEmitted = !1)
			const e = t.awaitWriteFinish,
				r = { stabilityThreshold: 2e3, pollInterval: 100 },
				s = {
					persistent: !0,
					ignoreInitial: !1,
					ignorePermissionErrors: !1,
					interval: 100,
					binaryInterval: 300,
					followSymlinks: !0,
					usePolling: !1,
					atomic: !0,
					...t,
					ignored: t.ignored ? O(t.ignored) : O([]),
					awaitWriteFinish:
						e === !0 ? r : typeof e == "object" ? { ...r, ...e } : !1
				}
			ht && (s.usePolling = !0),
				s.atomic === void 0 && (s.atomic = !s.usePolling)
			const n = process.env.CHOKIDAR_USEPOLLING
			if (n !== void 0) {
				const a = n.toLowerCase()
				a === "false" || a === "0"
					? (s.usePolling = !1)
					: a === "true" || a === "1"
						? (s.usePolling = !0)
						: (s.usePolling = !!a)
			}
			const h = process.env.CHOKIDAR_INTERVAL
			h && (s.interval = Number.parseInt(h, 10))
			let o = 0
			;(this._emitReady = () => {
				o++,
					o >= this._readyCount &&
						((this._emitReady = L),
						(this._readyEmitted = !0),
						process.nextTick(() => this.emit(p.READY)))
			}),
				(this._emitRaw = (...a) => this.emit(p.RAW, ...a)),
				(this._boundRemove = this._remove.bind(this)),
				(this.options = s),
				(this._nodeFsHandler = new k(this)),
				Object.freeze(s)
		}
		_addIgnoredPath(t) {
			if (q(t)) {
				for (const e of this._ignoredPaths)
					if (q(e) && e.path === t.path && e.recursive === t.recursive) return
			}
			this._ignoredPaths.add(t)
		}
		_removeIgnoredPath(t) {
			if ((this._ignoredPaths.delete(t), typeof t == "string"))
				for (const e of this._ignoredPaths)
					q(e) && e.path === t && this._ignoredPaths.delete(e)
		}
		add(t, e, r) {
			const { cwd: s } = this.options
			;(this.closed = !1), (this._closePromise = void 0)
			let n = dt(t)
			return (
				s && (n = n.map((h) => se(h, s))),
				n.forEach((h) => {
					this._removeIgnoredPath(h)
				}),
				(this._userIgnored = void 0),
				this._readyCount || (this._readyCount = 0),
				(this._readyCount += n.length),
				Promise.all(
					n.map(async (h) => {
						const o = await this._nodeFsHandler._addToNodeFs(
							h,
							!r,
							void 0,
							0,
							e
						)
						return o && this._emitReady(), o
					})
				).then((h) => {
					this.closed ||
						h.forEach((o) => {
							o && this.add(f.dirname(o), f.basename(e || o))
						})
				}),
				this
			)
		}
		unwatch(t) {
			if (this.closed) return this
			const e = dt(t),
				{ cwd: r } = this.options
			return (
				e.forEach((s) => {
					!f.isAbsolute(s) &&
						!this._closers.has(s) &&
						(r && (s = f.join(r, s)), (s = f.resolve(s))),
						this._closePath(s),
						this._addIgnoredPath(s),
						this._watched.has(s) &&
							this._addIgnoredPath({ path: s, recursive: !0 }),
						(this._userIgnored = void 0)
				}),
				this
			)
		}
		close() {
			if (this._closePromise) return this._closePromise
			;(this.closed = !0), this.removeAllListeners()
			const t = []
			return (
				this._closers.forEach((e) =>
					e.forEach((r) => {
						const s = r()
						s instanceof Promise && t.push(s)
					})
				),
				this._streams.forEach((e) => e.destroy()),
				(this._userIgnored = void 0),
				(this._readyCount = 0),
				(this._readyEmitted = !1),
				this._watched.forEach((e) => e.dispose()),
				this._closers.clear(),
				this._watched.clear(),
				this._streams.clear(),
				this._symlinkPaths.clear(),
				this._throttled.clear(),
				(this._closePromise = t.length
					? Promise.all(t).then(() => {})
					: Promise.resolve()),
				this._closePromise
			)
		}
		getWatched() {
			const t = {}
			return (
				this._watched.forEach((e, r) => {
					const n =
						(this.options.cwd ? f.relative(this.options.cwd, r) : r) || mt
					t[n] = e.getChildren().sort()
				}),
				t
			)
		}
		emitWithAll(t, e) {
			this.emit(t, ...e), t !== p.ERROR && this.emit(p.ALL, t, ...e)
		}
		async _emit(t, e, r) {
			if (this.closed) return
			const s = this.options
			$ && (e = f.normalize(e)), s.cwd && (e = f.relative(s.cwd, e))
			const n = [e]
			r != null && n.push(r)
			let h = s.awaitWriteFinish,
				o
			if (h && (o = this._pendingWrites.get(e)))
				return (o.lastChange = new Date()), this
			if (s.atomic) {
				if (t === p.UNLINK)
					return (
						this._pendingUnlinks.set(e, [t, ...n]),
						setTimeout(
							() => {
								this._pendingUnlinks.forEach((a, c) => {
									this.emit(...a),
										this.emit(p.ALL, ...a),
										this._pendingUnlinks.delete(c)
								})
							},
							typeof s.atomic == "number" ? s.atomic : 100
						),
						this
					)
				t === p.ADD &&
					this._pendingUnlinks.has(e) &&
					((t = p.CHANGE), this._pendingUnlinks.delete(e))
			}
			if (h && (t === p.ADD || t === p.CHANGE) && this._readyEmitted) {
				const a = (c, l) => {
					c
						? ((t = p.ERROR), (n[0] = c), this.emitWithAll(t, n))
						: l &&
							(n.length > 1 ? (n[1] = l) : n.push(l), this.emitWithAll(t, n))
				}
				return this._awaitWriteFinish(e, h.stabilityThreshold, t, a), this
			}
			if (t === p.CHANGE && !this._throttle(p.CHANGE, e, 50)) return this
			if (
				s.alwaysStat &&
				r === void 0 &&
				(t === p.ADD || t === p.ADD_DIR || t === p.CHANGE)
			) {
				let a = s.cwd ? f.join(s.cwd, e) : e,
					c
				try {
					c = await (0, z.stat)(a)
				} catch {}
				if (!c || this.closed) return
				n.push(c)
			}
			return this.emitWithAll(t, n), this
		}
		_handleError(t) {
			const e = t && t.code
			return (
				t &&
					e !== "ENOENT" &&
					e !== "ENOTDIR" &&
					(!this.options.ignorePermissionErrors ||
						(e !== "EPERM" && e !== "EACCES")) &&
					this.emit(p.ERROR, t),
				t || this.closed
			)
		}
		_throttle(t, e, r) {
			this._throttled.has(t) || this._throttled.set(t, new Map())
			const s = this._throttled.get(t)
			if (!s) throw new Error("invalid throttle")
			const n = s.get(e)
			if (n) return n.count++, !1
			let h,
				o = () => {
					const c = s.get(e),
						l = c ? c.count : 0
					return (
						s.delete(e), clearTimeout(h), c && clearTimeout(c.timeoutObject), l
					)
				}
			h = setTimeout(o, r)
			const a = { timeoutObject: h, clear: o, count: 0 }
			return s.set(e, a), a
		}
		_incrReadyCount() {
			return this._readyCount++
		}
		_awaitWriteFinish(t, e, r, s) {
			const n = this.options.awaitWriteFinish
			if (typeof n != "object") return
			let h = n.pollInterval,
				o,
				a = t
			this.options.cwd && !f.isAbsolute(t) && (a = f.join(this.options.cwd, t))
			const c = new Date(),
				l = this._pendingWrites
			function u(d) {
				;(0, pt.stat)(a, (m, w) => {
					if (m || !l.has(t)) {
						m && m.code !== "ENOENT" && s(m)
						return
					}
					const P = Number(new Date())
					d && w.size !== d.size && (l.get(t).lastChange = P)
					const bt = l.get(t)
					P - bt.lastChange >= e
						? (l.delete(t), s(void 0, w))
						: (o = setTimeout(u, h, w))
				})
			}
			l.has(t) ||
				(l.set(t, {
					lastChange: c,
					cancelWait: () => (l.delete(t), clearTimeout(o), r)
				}),
				(o = setTimeout(u, h)))
		}
		_isIgnored(t, e) {
			if (this.options.atomic && Qt.test(t)) return !0
			if (!this._userIgnored) {
				const { cwd: r } = this.options,
					n = (this.options.ignored || []).map(ut(r)),
					o = [...[...this._ignoredPaths].map(ut(r)), ...n]
				this._userIgnored = ee(o, void 0)
			}
			return this._userIgnored(t, e)
		}
		_isntIgnored(t, e) {
			return !this._isIgnored(t, e)
		}
		_getWatchHelpers(t) {
			return new Q(t, this.options.followSymlinks, this)
		}
		_getWatchedDir(t) {
			const e = f.resolve(t)
			return (
				this._watched.has(e) ||
					this._watched.set(e, new J(e, this._boundRemove)),
				this._watched.get(e)
			)
		}
		_hasReadPermissions(t) {
			return this.options.ignorePermissionErrors ? !0 : !!(Number(t.mode) & 256)
		}
		_remove(t, e, r) {
			const s = f.join(t, e),
				n = f.resolve(s)
			if (
				((r = r ?? (this._watched.has(s) || this._watched.has(n))),
				!this._throttle("remove", s, 100))
			)
				return
			!r && this._watched.size === 1 && this.add(t, e, !0),
				this._getWatchedDir(s)
					.getChildren()
					.forEach((d) => this._remove(s, d))
			const a = this._getWatchedDir(t),
				c = a.has(e)
			a.remove(e), this._symlinkPaths.has(n) && this._symlinkPaths.delete(n)
			let l = s
			if (
				(this.options.cwd && (l = f.relative(this.options.cwd, s)),
				this.options.awaitWriteFinish &&
					this._pendingWrites.has(l) &&
					this._pendingWrites.get(l).cancelWait() === p.ADD)
			)
				return
			this._watched.delete(s), this._watched.delete(n)
			const u = r ? p.UNLINK_DIR : p.UNLINK
			c && !this._isIgnored(s) && this._emit(u, s), this._closePath(s)
		}
		_closePath(t) {
			this._closeFile(t)
			const e = f.dirname(t)
			this._getWatchedDir(e).remove(f.basename(t))
		}
		_closeFile(t) {
			const e = this._closers.get(t)
			e && (e.forEach((r) => r()), this._closers.delete(t))
		}
		_addPathCloser(t, e) {
			if (!e) return
			let r = this._closers.get(t)
			r || ((r = []), this._closers.set(t, r)), r.push(e)
		}
		_readdirp(t, e) {
			if (this.closed) return
			let r = { type: p.ALL, alwaysStat: !0, lstat: !0, ...e, depth: 0 },
				s = rt(t, r)
			return (
				this._streams.add(s),
				s.once(at, () => {
					s = void 0
				}),
				s.once(V, () => {
					s && (this._streams.delete(s), (s = void 0))
				}),
				s
			)
		}
	}
function oe(i, t = {}) {
	const e = new M(t)
	return e.add(i), e
}
var gt = { watch: oe, FSWatcher: M }
var H = j(require("node:path"), 1),
	yt = he(process.argv[2]),
	Pt = process.argv[3],
	ae = Pt ? JSON.parse(Pt) : [],
	v = gt.watch(yt, {
		ignored: ae,
		ignoreInitial: !0,
		cwd: yt,
		awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 10 }
	}),
	x = (i, t) => {
		const e = t ? `${i}	${ce(t)}` : i
		process.stdout.write(`${e}
`)
	}
x("ready")
v.on("add", (i) => x("file-add", i))
v.on("change", (i) => x("file-change", i))
v.on("unlink", (i) => x("file-remove", i))
v.on("addDir", (i) => x("dir-add", i))
v.on("unlinkDir", (i) => x("dir-remove", i))
process.on("SIGTERM", () => Rt())
process.on("SIGINT", () => Rt())
function Rt() {
	v.close().then(() => {
		process.exit(0)
	})
}
function he(i) {
	return i
		? H.default.isAbsolute(i)
			? i
			: H.default.resolve(process.cwd(), i)
		: process.cwd()
}
function ce(i) {
	return i.split(H.default.sep).join("/")
}
