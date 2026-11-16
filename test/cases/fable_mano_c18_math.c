#include <stdio.h>
#include <math.h>
int main() { printf("%.4f %.4f %.4f %.4f\n", sqrt(2), pow(2, 10), pow(2, 0.5), pow(-8, 1.0 / 3)); printf("%.1f %.1f %.1f %.1f %.1f %.1f\n", floor(-2.5), ceil(-2.5), round(-2.5), round(2.5), trunc(-2.7), fabs(-3.5)); printf("%.4f %.4f %.4f %.4f\n", sin(M_PI / 6), cos(0), tan(M_PI / 4), atan2(1, 1)); printf("%.4f %.4f %.4f %.4f\n", exp(1), log(M_E), log10(1000), fmod(7.5, 2)); printf("%f %f %f\n", sqrt(-1), pow(0, 0), 1.0 / 0); printf("%d %d\n", (int) pow(10, 2), (int) pow(5, 3)); printf("%.2f %.2f\n", fmod(-7.5, 2), hypot(3, 4)); return 0; }
