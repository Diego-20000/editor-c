#include <stdio.h>
float MITAD(int);
int SUMA(int, int);
void LINEA(int);
int NOUSADA(void);
int DADO(void);
int main(void) {
  LINEA(4);
  printf("%.1f %d\n", MITAD(7) + 0.0, SUMA(2, 3));
  return 0;
}
float MITAD(int X) { return X / 2.0; }
int SUMA(int A, int B) { return A + B; }
void LINEA(int X) { int i; for (i = 0; i < X; i++) putchar('-'); putchar('\n'); }
