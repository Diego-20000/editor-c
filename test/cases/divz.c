#include <stdio.h>
#include <math.h>
#include <stdlib.h>
int main() {
  float a = 0, b = 0, p = 5; int z = 0; double neg = -1;
  float r = a / b;
  printf("%f %.2f\n", r, r);
  printf("%f %f\n", p / z, -p / z);
  printf("%f\n", sqrt(neg));
  printf("%f %f %f\n", sqrt(16), pow(2, 10), fabs(-3.5));
  printf("%f %f %f %f\n", floor(-2.5), ceil(-2.5), round(-2.5), round(2.5));
  printf("%f %f\n", fmod(7.5, 2), log10(1000));
  printf("%d %d\n", abs(-5), abs(5));
  return 0;
}
