These fixtures are constructed for local regression tests, not captured FRITZ!Box responses.

`client-local-cert.pem` and `client-local-key.pem` are a self-signed localhost certificate and its disposable test key. They contain no production credentials and are used only by a loopback HTTPS mock server to check each client's certificate-validation setting.
