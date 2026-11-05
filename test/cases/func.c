#include <stdio.h>
#define N 5
#define PI 3.14159
#define LIM (N * 2)
int fact(int n) { if (n <= 1) return 1; return n * fact(n - 1); }
int fib(int n);
float area(float r) { return PI * r * r; }
void saludar(char c, int veces) { int i; for (i = 0; i < veces; i++) printf("%c", c); printf("\n"); }
int mayor(int a, int b) { return a > b ? a : b; }
int gcont = 10;
int main() {
  int A[N] = {5, 3, 8}, i, M[2][3] = {{1, 2, 3}, {4, 5}};
  float B[3];
  printf("%d %d %d\n", fact(5), fib(10), mayor(3, 9));
  printf("%.3f\n", area(2));
  saludar('*', 4);
  for (i = 0; i < N; i++) printf("%d ", A[i]);
  printf("\n");
  for (i = 0; i < 2; i++) { int j; for (j = 0; j < 3; j++) printf("%d ", M[i][j]); }
  printf("\n");
  B[0] = 1; B[1] = B[0] / 3; B[2] = 2.5;
  printf("%f %f %f %d %d\n", B[0], B[1], B[2], LIM, gcont);
  gcont += 5; printf("%d\n", gcont);
  return 0;
}
int fib(int n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); }
