#include <stdio.h>
float aF(float C); float aC(float F);
int main() { float T; for (T = -40; T <= 100; T += 35) printf("%7.2f C = %7.2f F\n", T, aF(T)); printf("%.4f\n", aC(aF(36.6f))); return 0; }
float aF(float C) { return C * 9 / 5 + 32; }
float aC(float F) { return (F - 32) * 5 / 9; }
