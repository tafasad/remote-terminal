package com.rafae.remoteterminal

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import okhttp3.*
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class TerminalActivity : AppCompatActivity() {

    private lateinit var webview: android.webkit.WebView
    private var token: String? = null
    private var username: String? = null
    private var host: String? = null
    private var port: String? = null

    private var ws: WebSocket? = null
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_terminal)

        webview = findViewById(R.id.webview)
        host = intent.getStringExtra(EXTRA_HOST)
        port = intent.getStringExtra(EXTRA_PORT)
        token = intent.getStringExtra(EXTRA_TOKEN)
        username = intent.getStringExtra(EXTRA_USER)

        findViewById<TextView>(R.id.tvTitle).text = "Terminal - $username"

        webview.settings.javaScriptEnabled = true
        webview.settings.domStorageEnabled = true
        webview.setBackgroundColor(Color.BLACK)

        val html = assets.open("terminal.html").bufferedReader().use { it.readText() }
        webview.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)

        conectarWebSocket()
    }

    private fun conectarWebSocket() {
        val rawHost = host ?: "192.168.18.14"
        val isHttps = rawHost.startsWith("https://")
        val base = if (isHttps) rawHost else "http://$rawHost"
        val wsScheme = if (isHttps) "wss" else "ws"
        val hostOnly = if (isHttps) rawHost else rawHost
        val wsUrl = "$wsScheme://$hostOnly:$port/terminal?token=$token"

        val request = Request.Builder().url(wsUrl).build()
        val listener = object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                runOnUiThread {
                    Toast.makeText(this@TerminalActivity, "Conectado!", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onMessage(ws: WebSocket, text: String) {
                runOnUiThread {
                    val msg = JSONObject(text)
                    when (msg.getString("type")) {
                        "output" -> webview.evaluateJavascript(
                            "term.write(" + JSONObject.quote(msg.getString("data")) + ");", null
                        )
                        "exit" -> {
                            webview.evaluateJavascript(
                                "term.write(" + JSONObject.quote(">> " + msg.getString("data") + "\\n") + ");", null
                            )
                        }
                        "error" -> {
                            Toast.makeText(this@TerminalActivity, msg.getString("data"), Toast.LENGTH_LONG).show()
                        }
                    }
                }
            }

            override fun onClosing(ws: WebSocket, code: Int, reason: String) {
                runOnUiThread {
                    Toast.makeText(this@TerminalActivity, "Conexao encerrada", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                runOnUiThread {
                    Toast.makeText(this@TerminalActivity, "Erro WS: ${t.message}", Toast.LENGTH_LONG).show()
                }
            }
        }

        ws = client.newWebSocket(request, listener)

        webview.setWebViewClient(object : android.webkit.WebViewClient() {
            override fun onPageFinished(view: android.webkit.WebView?, url: String?) {
                if (ws != null) {
                    webview.evaluateJavascript(
                        """
                        term.onData(function(data) {
                            Android.sendInput(data);
                        });
                        """.trimIndent(), null
                    )
                }
            }
        })

        webview.addJavascriptInterface(object {
            @android.webkit.JavascriptInterface
            fun sendInput(data: String) {
                ws?.send(JSONObject().put("type", "input").put("data", data).toString())
            }
        }, "Android")
    }

    override fun onDestroy() {
        super.onDestroy()
        ws?.close(1000, "Activity destroyed")
        ws = null
    }

    companion object {
        const val EXTRA_HOST = "host"
        const val EXTRA_PORT = "port"
        const val EXTRA_TOKEN = "token"
        const val EXTRA_USER = "user"

        fun start(activity: Activity, host: String, port: String, token: String, username: String) {
            val intent = Intent(activity, TerminalActivity::class.java).apply {
                putExtra(EXTRA_HOST, host)
                putExtra(EXTRA_PORT, port)
                putExtra(EXTRA_TOKEN, token)
                putExtra(EXTRA_USER, username)
            }
            activity.startActivity(intent)
        }
    }
}
