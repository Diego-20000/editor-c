#include <stdio.h>
int main() {
  int a = 42, b = -7; float f = 3.14159f, g = -0.005f; double d = 2.5, e = 1234567.891;
  printf("[%d] [%5d] [%-5d] [%05d] [%+d] [% d] [%i]\n", a, a, a, a, a, a, b);
  printf("[%f] [%.2f] [%8.3f] [%-8.1f] [%08.2f] [%+.1f]\n", f, f, f, f, g, d);
  printf("[%.0f] [%.0f] [%.0f] [%.1f] [%.2f] [%.2f]\n", 0.5, 1.5, 2.5, 0.25, 0.125, 1.005);
  printf("[%e] [%E] [%.2e] [%g] [%g] [%g] [%G]\n", e, e, d, e, 0.0001, 100000.0, 1e-10);
  printf("[%g] [%g] [%g] [%.3g]\n", 123456789.0, 0.5, 3.0, 3.14159);
  printf("[%c] [%c] [%5c] [%-3c]|\n", 65, 'z', 'q', 'r');
  printf("[%s] [%10s] [%-10s] [%.3s]\n", "hola", "hola", "hola", "abcdef");
  printf("[%x] [%X] [%#x] [%o] [%u] [%u]\n", 255, 255, 255, 8, 42, -1);
  printf("[%ld] [%lu] [%5.1f%%]\n", 123456789012L, 4000000000UL, 99.5);
  printf("[%*d] [%.*f]\n", 6, 42, 3, 3.14159);
  printf("tab\there\nline2 \"quoted\" \\ back \x41\n");
  printf("%d %d %d\n", 7/2, -7/2, -7%3);
  printf("%f %f\n", 1.0/3, 2.0f/3);
  printf("%.10f %.15f\n", 0.1, 0.1f);
  printf("%f %f %f\n", 1e20, 123456789.123456789, 0.000001234);
  printf("%5.2f|%-7.2f|%07.2f|\n", -1.5, -1.5, -1.5);
  printf("%d%%\n", 50);
  return 0;
}
