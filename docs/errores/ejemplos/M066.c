#include <stdio.h>
int main() {
  int i, N = 3; float S, V;
  for (i = 0; i < N; i++) { V = i * 1.5; S = S + V; }
  printf("%f\n", S);
  return 0;
}
