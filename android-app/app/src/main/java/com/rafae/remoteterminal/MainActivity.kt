package com.rafae.remoteterminal

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.KeyEvent
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import okhttp3.*
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {

    private lateinit var inputHost: EditText
    private lateinit var inputPort: EditText
    private lateinit var inputUser: EditText
    private lateinit var inputPass: EditText
    private lateinit var btnConnect: Button
    private lateinit var progress: ProgressBar

    private val httpsClient: OkHttpClient by lazy { SslHelper.createTrustAllClient() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        inputHost = findViewById(R.id.inputHost)
        inputPort = findViewById(R.id.inputPort)
        inputUser = findViewById(R.id.inputUser)
        inputPass = findViewById(R.id.inputPass)
        btnConnect = findViewById(R.id.btnConnect)
        progress = findViewById(R.id.progress)

        inputHost.setText("192.168.18.14")
        inputPort.setText("3000")

        inputPass.setOnEditorActionListener { v, actionId, event ->
            if (actionId == EditorInfo.IME_ACTION_DONE ||
                (event != null && event.keyCode == KeyEvent.KEYCODE_ENTER && event.action == KeyEvent.ACTION_DOWN)) {
                conectar()
                true
            } else false
        }

        btnConnect.setOnClickListener { conectar() }
    }

    private fun conectar() {
        val host = inputHost.text.toString().trim()
        val port = inputPort.text.toString().trim().ifEmpty { "3000" }
        val user = inputUser.text.toString().trim()
        val pass = inputPass.text.toString()

        if (host.isEmpty() || user.isEmpty() || pass.isEmpty()) {
            Toast.makeText(this, "Preencha todos os campos", Toast.LENGTH_SHORT).show()
            return
        }

        progress.visibility = ProgressBar.VISIBLE
        btnConnect.isEnabled = false

        val apiUrl = if (host.startsWith("http")) {
            "${host.trimEnd('/')}:$port/api/login"
        } else {
            "https://$host:$port/api/login"
        }

        val json = JSONObject()
            .put("username", user)
            .put("password", pass)
            .toString()

        val body = RequestBody.create(MediaType.parse("application/json"), json)
        val request = Request.Builder().url(apiUrl).post(body).build()

        httpsClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: java.io.IOException) {
                runOnUiThread {
                    progress.visibility = ProgressBar.GONE
                    btnConnect.isEnabled = true
                    Toast.makeText(this@MainActivity, "Erro: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }

            override fun onResponse(call: Call, response: Response) {
                runOnUiThread {
                    progress.visibility = ProgressBar.GONE
                    btnConnect.isEnabled = true
                }
                if (!response.isSuccessful) {
                    runOnUiThread {
                        Toast.makeText(this@MainActivity, "Falha login (${response.code()})", Toast.LENGTH_SHORT).show()
                    }
                    return
                }
                val resp = JSONObject(response.body()?.string() ?: "{}")
                val token = resp.getString("token")
                val username = resp.getString("username")

                runOnUiThread {
                    TerminalActivity.start(this@MainActivity, host, port, token, username)
                    Toast.makeText(this@MainActivity, "Conectado como $username", Toast.LENGTH_SHORT).show()
                }
            }
        })
    }
}
