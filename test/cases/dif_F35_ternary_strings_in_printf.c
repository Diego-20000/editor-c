#include <stdio.h>
int main(void){
  int n = 4;
  printf("%d es %s\n", n, n % 2 == 0 ? "par" : "impar");
  puts(n > 3 ? "grande" : "chico");
  return 0;
}
