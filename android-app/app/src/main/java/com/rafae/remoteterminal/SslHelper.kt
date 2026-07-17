package com.rafae.remoteterminal

import android.annotation.SuppressLint
import android.content.Context
import okhttp3.OkHttpClient
import org.json.JSONObject
import java.security.SecureRandom
import java.security.cert.X509Certificate
import javax.net.ssl.*
import java.util.concurrent.TimeUnit

object SslHelper {

    fun createTrustAllClient(): OkHttpClient {
        return try {
            val trustAll = arrayOf<TrustManager>(@SuppressLint("CustomX509TrustManager")
            object : X509TrustManager {
                override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {}
                override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {}
                override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
            })

            val sslContext = SSLContext.getInstance("TLS")
            sslContext.init(null, trustAll, SecureRandom())
            val sslSocketFactory = sslContext.socketFactory

            OkHttpClient.Builder()
                .sslSocketFactory(sslSocketFactory, trustAll[0] as X509TrustManager)
                .hostnameVerifier { _, _ -> true }
                .readTimeout(15, TimeUnit.SECONDS)
                .build()
        } catch (e: Exception) {
            OkHttpClient.Builder().readTimeout(15, TimeUnit.SECONDS).build()
        }
    }
}
