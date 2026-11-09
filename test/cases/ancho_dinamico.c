#include <stdio.h>
int main() {
  printf("[%*d]\n", 5, 42);
  printf("[%-*d]\n", 5, 42);
  printf("[%*d]\n", -5, 42);
  printf("[%.*f]\n", 2, 3.14159);
  printf("[%*.*f]\n", 8, 3, 2.5);
  return 0;
}
