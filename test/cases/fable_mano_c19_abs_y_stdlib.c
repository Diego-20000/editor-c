#include <stdio.h>
#include <stdlib.h>
int main() { printf("%d %d %ld\n", abs(-5), abs(5 - 12), labs(-9000000000L)); printf("%d %d %.2f\n", atoi("  42abc"), atoi("-7"), atof("3.5e1x")); printf("%d %d\n", atoi("abc"), atoi("")); srand(7); printf("%d %d %d\n", rand() % 100, rand() % 100, rand()); srand(7); printf("%d\n", rand() % 100); printf("%d\n", RAND_MAX); return 0; }
