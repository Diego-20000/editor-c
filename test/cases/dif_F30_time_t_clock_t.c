#include <stdio.h>
#include <time.h>
int main(void){
  time_t t = time(NULL);
  clock_t c = clock();
  printf("%d\n", t > 0 && c >= 0);
  return 0;
}
