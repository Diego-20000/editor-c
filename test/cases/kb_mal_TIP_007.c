#include <stdio.h>
int main() {
  int N;
  float S = 0;
  for (N = 1; N <= 3; N++) {
    S = S + 1 / N;
  }
  printf("%.2f\n", S);
  return 0;
}